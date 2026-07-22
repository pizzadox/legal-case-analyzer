import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (severity) {
      where.severity = severity;
    }
    if (status) {
      where.status = status;
    }

    const [episodes, total] = await Promise.all([
      db.episode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { episodeNumber: 'asc' },
        include: {
          persons: {
            include: {
              person: {
                select: {
                  id: true,
                  fullName: true,
                  shortName: true,
                  role: true,
                  isKolesnichenko: true,
                },
              },
            },
          },
          locations: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  type: true,
                },
              },
            },
          },
          articles: {
            include: {
              article: {
                select: {
                  id: true,
                  code: true,
                  number: true,
                  description: true,
                  category: true,
                },
              },
            },
          },
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  originalName: true,
                  documentType: true,
                  documentDate: true,
                  processingStatus: true,
                },
              },
            },
          },
          guiltAssessments: {
            include: {
              person: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                },
              },
            },
          },
        },
      }),
      db.episode.count({ where }),
    ]);

    const formattedEpisodes = episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      description: episode.description,
      date: episode.date,
      episodeNumber: episode.episodeNumber,
      severity: episode.severity,
      status: episode.status,
      persons: episode.persons.map((pe) => ({
        personId: pe.person.id,
        fullName: pe.person.fullName,
        shortName: pe.person.shortName,
        role: pe.person.role,
        isKolesnichenko: pe.person.isKolesnichenko,
        involvement: pe.involvement,
      })),
      locations: episode.locations.map((el) => ({
        locationId: el.location.id,
        name: el.location.name,
        address: el.location.address,
        type: el.location.type,
        context: el.context,
      })),
      articles: episode.articles.map((ea) => ({
        articleId: ea.article.id,
        code: ea.article.code,
        number: ea.article.number,
        description: ea.article.description,
        category: ea.article.category,
      })),
      documents: episode.documents.map((ed) => ({
        documentId: ed.document.id,
        originalName: ed.document.originalName,
        documentType: ed.document.documentType,
        documentDate: ed.document.documentDate,
        processingStatus: ed.document.processingStatus,
        relevance: ed.relevance,
      })),
      guiltAssessments: episode.guiltAssessments.map((ga) => ({
        id: ga.id,
        personId: ga.person.id,
        personFullName: ga.person.fullName,
        personRole: ga.person.role,
        guiltLevel: ga.guiltLevel,
        evidenceStrength: ga.evidenceStrength,
        forecast: ga.forecast,
        confidence: ga.confidence,
      })),
    }));

    return NextResponse.json({
      episodes: formattedEpisodes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Episodes list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes', details: String(error) },
      { status: 500 }
    );
  }
}
