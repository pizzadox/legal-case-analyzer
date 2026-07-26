import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DOC_PROCESSOR_PORT = 3005;

/**
 * Process a document by delegating to the doc-processor microservice.
 * The microservice uses CLI-based VLM extraction (more stable than SDK base64 approach).
 * 
 * Two modes:
 * 1. If documentId is provided — resets status and triggers processing for that document
 * 2. If documentIds array is provided — triggers processing for each document
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, documentIds } = body;

    const ids = documentIds || (documentId ? [documentId] : []);
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'documentId or documentIds is required' },
        { status: 400 }
      );
    }

    const results: Array<{ documentId: string; status: string; message: string }> = [];

    for (const docId of ids) {
      // Fetch document from database
      const document = await db.document.findUnique({
        where: { id: docId },
        include: {
          processingQueue: { take: 1, orderBy: { queuePosition: 'asc' } },
        },
      });

      if (!document) {
        results.push({ documentId: docId, status: 'error', message: 'Document not found' });
        continue;
      }

      // Reset document status to pending for re-processing
      await db.document.update({
        where: { id: docId },
        data: {
          processingStatus: 'pending',
          processingError: null,
        },
      });

      // Reset or create processing queue entry
      const queueEntry = document.processingQueue[0];
      if (queueEntry) {
        await db.processingQueue.update({
          where: { id: queueEntry.id },
          data: {
            status: 'queued',
            startedAt: null,
            completedAt: null,
            error: null,
            progressPercent: 0,
            progressStep: null,
          },
        });

        // Trigger the doc-processor microservice to process this document
        try {
          const processorUrl = `http://localhost:${DOC_PROCESSOR_PORT}/api/process?documentId=${docId}`;
          const processorResponse = await fetch(processorUrl, { method: 'POST' });
          
          if (processorResponse.ok) {
            const processorData = await processorResponse.json();
            console.log(`[Process] Triggered doc-processor for ${docId}:`, processorData);
            results.push({ documentId: docId, status: 'triggered', message: 'Processing started via doc-processor' });
          } else {
            // If microservice call fails, it will still pick up the document in the next poll cycle
            console.log(`[Process] Doc-processor trigger failed for ${docId}, will be picked up by polling`);
            results.push({ documentId: docId, status: 'queued', message: 'Queued for processing (will be picked up by poll)' });
          }
        } catch (fetchError) {
          // Microservice might not be reachable — the polling will still pick it up
          console.log(`[Process] Doc-processor not reachable for ${docId}, will be picked up by polling: ${fetchError}`);
          results.push({ documentId: docId, status: 'queued', message: 'Queued for processing (will be picked up by poll)' });
        }
      } else {
        // Create a new queue entry if one doesn't exist
        const maxPos = await db.processingQueue.aggregate({ _max: { queuePosition: true } });
        await db.processingQueue.create({
          data: {
            documentId: docId,
            queuePosition: (maxPos._max.queuePosition ?? 0) + 1,
            status: 'queued',
            priority: 5,
          },
        });
        results.push({ documentId: docId, status: 'queued', message: 'Queued for processing' });
      }
    }

    // Return the first document's data as the primary response (for single document calls)
    const primaryResult = results[0];
    
    return NextResponse.json({
      success: true,
      documentId: primaryResult?.documentId,
      results,
      message: primaryResult?.message || 'Processing triggered',
    });
  } catch (error) {
    console.error('Process API error:', error);
    return NextResponse.json(
      { error: 'Failed to process document', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Cancel processing for a document.
 * Tries to cancel via the doc-processor microservice first, then falls back to direct DB update.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
  }

  // Try to cancel via doc-processor microservice
  try {
    const response = await fetch(
      `http://localhost:${DOC_PROCESSOR_PORT}/api/cancel?documentId=${documentId}`,
      { method: 'POST', signal: AbortSignal.timeout(3000) }
    );
    if (response.ok) {
      const data = await response.json();
      console.log(`[Process] Cancelled via doc-processor for ${documentId}:`, data);
      return NextResponse.json({ success: true, message: 'Processing cancelled' });
    }
  } catch (cancelError) {
    console.log(`[Process] Doc-processor cancel failed for ${documentId}, using DB fallback: ${cancelError}`);
  }

  // Fallback: reset status in DB directly
  try {
    await db.document.update({
      where: { id: documentId },
      data: { processingStatus: 'pending', processingError: null },
    });

    const queueEntry = await db.processingQueue.findFirst({
      where: { documentId, status: { in: ['queued', 'processing'] } },
    });

    if (queueEntry) {
      await db.processingQueue.update({
        where: { id: queueEntry.id },
        data: { status: 'failed', error: 'Cancelled by user', completedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, message: 'Processing cancelled (DB fallback)' });
  } catch (dbError) {
    console.error('[Process] DB fallback cancel error:', dbError);
    return NextResponse.json(
      { error: 'Failed to cancel processing', details: String(dbError) },
      { status: 500 }
    );
  }
}
