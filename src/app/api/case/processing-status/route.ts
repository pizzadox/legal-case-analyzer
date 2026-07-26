import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DOC_PROCESSOR_PORT = 3005;

/**
 * Try to get processing status from the doc-processor microservice.
 * Returns null if the service is unavailable or returns an error.
 */
async function tryMicroservice(caseId: string): Promise<NextResponse | null> {
  try {
    const response = await fetch(
      `http://localhost:${DOC_PROCESSOR_PORT}/api/status?caseId=${encodeURIComponent(caseId)}`,
      { signal: AbortSignal.timeout(3000) } // 3-second timeout
    );

    if (!response.ok) {
      console.log(`[Processing-Status] Microservice returned ${response.status}, falling back to DB`);
      return null;
    }

    const microserviceData = await response.json();

    // Normalize the microservice response to match our expected schema
    // The microservice returns `progress` (integer) while our API uses `progressPercent`
    const normalized = {
      caseId: microserviceData.caseId || caseId,
      total: microserviceData.total || 0,
      completed: microserviceData.completed || 0,
      failed: microserviceData.failed || 0,
      processing: microserviceData.processing || 0,
      queued: microserviceData.queued || 0,
      progressPercent: microserviceData.progress ?? microserviceData.progressPercent ?? 0,
      items: (microserviceData.items || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        documentName: item.documentName,
        queuePosition: item.queuePosition,
        status: item.status,
        startedAt: item.startedAt || null,
        completedAt: item.completedAt || null,
        error: item.error || null,
        processingStatus: item.processingStatus,
        isCurrentlyProcessing: item.isCurrentlyProcessing ?? (item.status === 'processing'),
        progressPercent: item.progressPercent ?? 0,
        progressStep: item.progressStep || null,
      })),
    };

    return NextResponse.json(normalized);
  } catch (microError) {
    console.log('[Processing-Status] Microservice unavailable, falling back to DB:', microError instanceof Error ? microError.message : String(microError));
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json(
        { caseId: '', total: 0, completed: 0, failed: 0, processing: 0, queued: 0, progressPercent: 0, items: [] },
        { status: 200 }
      );
    }

    // Try the microservice first for richer status (e.g., isCurrentlyProcessing tracking)
    const microserviceResponse = await tryMicroservice(caseId);
    if (microserviceResponse) {
      return microserviceResponse;
    }

    // Fallback: query processing queue directly from the DB
    console.log('[Processing-Status] Using DB fallback for case', caseId);
    const queueEntries = await db.processingQueue.findMany({
      where: {
        document: {
          caseId: caseId,
        },
      },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            processingStatus: true,
            fileName: true,
            processingError: true,
          },
        },
      },
      orderBy: {
        queuePosition: 'asc',
      },
    });

    const totalDocs = queueEntries.length;
    const completedDocs = queueEntries.filter(e => e.status === 'completed').length;
    const failedDocs = queueEntries.filter(e => e.status === 'failed').length;
    const processingDocs = queueEntries.filter(e => e.status === 'processing').length;
    const queuedDocs = queueEntries.filter(e => e.status === 'queued').length;

    // Calculate overall progress: completed=100%, failed=100% (done), processing=use its progressPercent, queued=0%
    const overallProgress = totalDocs > 0 
      ? Math.round(queueEntries.reduce((sum, e) => {
          if (e.status === 'completed') return sum + 100
          if (e.status === 'failed') return sum + 100 // failed is also "done"
          if (e.status === 'processing') return sum + (e.progressPercent || 0)
          return sum + 0 // queued
        }, 0) / totalDocs)
      : 0;

    const items = queueEntries.map(entry => ({
      id: entry.id,
      documentId: entry.document.id,
      documentName: entry.document.originalName,
      queuePosition: entry.queuePosition,
      status: entry.status,
      startedAt: entry.startedAt?.toISOString() || null,
      completedAt: entry.completedAt?.toISOString() || null,
      error: entry.error || entry.document.processingError || null,
      processingStatus: entry.document.processingStatus,
      isCurrentlyProcessing: entry.status === 'processing',
      progressPercent: entry.progressPercent || 0,
      progressStep: entry.progressStep || null,
    }));

    return NextResponse.json({
      caseId,
      total: totalDocs,
      completed: completedDocs,
      failed: failedDocs,
      processing: processingDocs,
      queued: queuedDocs,
      progressPercent: overallProgress,
      items,
    });
  } catch (error) {
    console.error('[Processing-Status] Error:', error);
    // Return empty response instead of 502 — never expose internal errors
    return NextResponse.json(
      { caseId: '', total: 0, completed: 0, failed: 0, processing: 0, queued: 0, progressPercent: 0, items: [] },
      { status: 200 }
    );
  }
}
