import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Reprocess a document - resets its status so it can be analyzed again
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
      include: { processingQueue: { take: 1, orderBy: { queuePosition: 'asc' } } },
    });

    if (!document) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }

    // Reset document status to pending for re-processing
    await db.document.update({
      where: { id },
      data: {
        processingStatus: 'pending',
        processingError: null,
        extractedText: null,
        documentType: null,
        documentDate: null,
        sourceReference: null,
        summary: null,
        processedAt: null,
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
    } else {
      // Create a new queue entry if one doesn't exist
      const maxPos = await db.processingQueue.aggregate({ _max: { queuePosition: true } });
      await db.processingQueue.create({
        data: {
          documentId: id,
          queuePosition: (maxPos._max.queuePosition ?? 0) + 1,
          status: 'queued',
          priority: 5,
        },
      });
    }

    // Clean up related extracted data (PersonDocument, EpisodeDocument, etc.)
    // Note: We don't delete Persons/Episodes/Articles themselves as they might be linked to other documents
    // Only delete the document-specific links
    await db.personDocument.deleteMany({ where: { documentId: id } });
    await db.episodeDocument.deleteMany({ where: { documentId: id } });
    await db.documentArticle.deleteMany({ where: { documentId: id } });
    await db.documentLocation.deleteMany({ where: { documentId: id } });
    await db.crossReference.deleteMany({ where: { sourceDocumentId: id } });
    await db.crossReference.deleteMany({ where: { targetDocumentId: id } });
    await db.legalCompliance.deleteMany({ where: { documentId: id } });

    return NextResponse.json({
      success: true,
      message: 'Документ готов к повторной обработке',
      documentId: id,
    });
  } catch (error) {
    console.error('Reprocess reset error:', error);
    return NextResponse.json(
      { error: 'Ошибка подготовки к повторной обработке', details: String(error) },
      { status: 500 }
    );
  }
}
