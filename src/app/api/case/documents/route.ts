import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (status) {
      where.processingStatus = status;
    }
    if (type) {
      where.documentType = type;
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.uploadedAt = dateFilter;
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          persons: {
            include: {
              person: true,
            },
          },
          episodes: {
            include: {
              episode: true,
            },
          },
          articles: {
            include: {
              article: true,
            },
          },
          processingQueue: {
            orderBy: { queuePosition: 'asc' },
            take: 1,
          },
          complianceChecks: {
            take: 5,
            orderBy: { checkedAt: 'desc' },
          },
        },
      }),
      db.document.count({ where }),
    ]);

    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      extractedText: doc.extractedText,
      summary: doc.summary,
      documentDate: doc.documentDate,
      documentType: doc.documentType,
      sourceReference: doc.sourceReference,
      processingStatus: doc.processingStatus,
      processingError: doc.processingError,
      uploadedAt: doc.uploadedAt,
      processedAt: doc.processedAt,
      persons: doc.persons.map((pd) => ({
        personId: pd.person.id,
        fullName: pd.person.fullName,
        role: pd.person.role,
        context: pd.context,
        mentionRole: pd.role,
      })),
      episodes: doc.episodes.map((ed) => ({
        episodeId: ed.episode.id,
        title: ed.episode.title,
        relevance: ed.relevance,
      })),
      articles: doc.articles.map((da) => ({
        articleId: da.article.id,
        code: da.article.code,
        description: da.article.description,
        context: da.context,
      })),
      queuePosition: doc.processingQueue[0]?.queuePosition || null,
      queueStatus: doc.processingQueue[0]?.status || null,
      complianceSummary: doc.complianceChecks.map((cc) => ({
        checkType: cc.checkType,
        status: cc.status,
        description: cc.description,
      })),
    }));

    return NextResponse.json({
      documents: formattedDocuments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Documents list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: String(error) },
      { status: 500 }
    );
  }
}
