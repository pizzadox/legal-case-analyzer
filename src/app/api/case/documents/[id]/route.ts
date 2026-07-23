import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
      include: {
        persons: { include: { person: true } },
        episodes: { include: { episode: true } },
        articles: { include: { article: true } },
        processingQueue: { orderBy: { queuePosition: 'asc' }, take: 1 },
        complianceChecks: { take: 5, orderBy: { checkedAt: 'desc' } },
        crossReferences: { take: 10 },
        referencedBy: { take: 10 },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }

    return NextResponse.json({
      id: document.id,
      fileName: document.fileName,
      originalName: document.originalName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      extractedText: document.extractedText,
      summary: document.summary,
      documentDate: document.documentDate,
      documentType: document.documentType,
      sourceReference: document.sourceReference,
      processingStatus: document.processingStatus,
      processingError: document.processingError,
      uploadedAt: document.uploadedAt,
      processedAt: document.processedAt,
      persons: document.persons.map(pd => ({
        personId: pd.person.id,
        fullName: pd.person.fullName,
        role: pd.person.role,
        context: pd.context,
        mentionRole: pd.role,
      })),
      episodes: document.episodes.map(ed => ({
        episodeId: ed.episode.id,
        title: ed.episode.title,
        relevance: ed.relevance,
      })),
      articles: document.articles.map(da => ({
        articleId: da.article.id,
        code: da.article.code,
        description: da.article.description,
        context: da.context,
      })),
      crossReferences: document.crossReferences.map(cr => ({
        id: cr.id,
        referenceText: cr.referenceText,
        referenceType: cr.referenceType,
        targetDocumentId: cr.targetDocumentId,
      })),
    });
  } catch (error) {
    console.error('Document GET error:', error);
    return NextResponse.json({ error: 'Ошибка получения документа' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if document exists
    const document = await db.document.findUnique({
      where: { id },
      include: {
        persons: true,
        episodes: true,
        articles: true,
        locations: true,
        crossReferences: true,
        referencedBy: true,
        complianceChecks: true,
        chatReferences: true,
        processingQueue: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }

    // Delete all related records first (to avoid foreign key constraint errors)
    // 1. Delete PersonDocument links
    await db.personDocument.deleteMany({ where: { documentId: id } });

    // 2. Delete EpisodeDocument links
    await db.episodeDocument.deleteMany({ where: { documentId: id } });

    // 3. Delete DocumentArticle links
    await db.documentArticle.deleteMany({ where: { documentId: id } });

    // 4. Delete DocumentLocation links
    await db.documentLocation.deleteMany({ where: { documentId: id } });

    // 5. Delete CrossReferences where this doc is source or target
    await db.crossReference.deleteMany({ where: { sourceDocumentId: id } });
    await db.crossReference.deleteMany({ where: { targetDocumentId: id } });

    // 6. Delete LegalCompliance checks
    await db.legalCompliance.deleteMany({ where: { documentId: id } });

    // 7. Delete ChatMessageDocument references
    await db.chatMessageDocument.deleteMany({ where: { documentId: id } });

    // 8. Delete ProcessingQueue entries
    await db.processingQueue.deleteMany({ where: { documentId: id } });

    // 9. Delete the document itself
    await db.document.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Документ удалён' });
  } catch (error) {
    console.error('Document DELETE error:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления документа', details: String(error) },
      { status: 500 }
    );
  }
}
