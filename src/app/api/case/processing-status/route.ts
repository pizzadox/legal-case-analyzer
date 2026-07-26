import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    // Query processing queue directly from the DB
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
    // Return empty response instead of 502 - never expose internal errors
    return NextResponse.json(
      { caseId: '', total: 0, completed: 0, failed: 0, processing: 0, queued: 0, progressPercent: 0, items: [] },
      { status: 200 }
    );
  }
}
