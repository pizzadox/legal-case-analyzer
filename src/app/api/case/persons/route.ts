import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const role = searchParams.get('role');
    const isKolesnichenko = searchParams.get('isKolesnichenko');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (caseId) {
      where.caseId = caseId;
    }
    if (role) {
      where.role = role;
    }
    if (isKolesnichenko) {
      where.isKolesnichenko = isKolesnichenko === 'true';
    }

    const [persons, total] = await Promise.all([
      db.person.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        include: {
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  originalName: true,
                  documentType: true,
                  processingStatus: true,
                  summary: true,
                },
              },
            },
          },
          episodes: {
            include: {
              episode: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  date: true,
                  severity: true,
                  status: true,
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
                  punishmentMin: true,
                  punishmentMax: true,
                },
              },
            },
          },
          defenseLines: {
            select: {
              id: true,
              strategyType: true,
              title: true,
              strength: true,
              probability: true,
            },
          },
          guiltAssessments: {
            include: {
              episode: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      db.person.count({ where }),
    ]);

    const formattedPersons = persons.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      shortName: person.shortName,
      role: person.role,
      status: person.status,
      description: person.description,
      birthDate: person.birthDate,
      occupation: person.occupation,
      alias: person.alias,
      isKolesnichenko: person.isKolesnichenko,
      defenseStrategy: person.defenseStrategy,
      documents: person.documents.map((pd) => ({
        documentId: pd.document.id,
        originalName: pd.document.originalName,
        documentType: pd.document.documentType,
        processingStatus: pd.document.processingStatus,
        summary: pd.document.summary,
        mentionRole: pd.role,
        context: pd.context,
      })),
      episodes: person.episodes.map((pe) => ({
        episodeId: pe.episode.id,
        title: pe.episode.title,
        description: pe.episode.description,
        date: pe.episode.date,
        severity: pe.episode.severity,
        status: pe.episode.status,
        involvement: pe.involvement,
      })),
      articles: person.articles.map((pa) => ({
        articleId: pa.article.id,
        code: pa.article.code,
        number: pa.article.number,
        description: pa.article.description,
        category: pa.article.category,
        punishmentMin: pa.article.punishmentMin,
        punishmentMax: pa.article.punishmentMax,
        chargeStatus: pa.chargeStatus,
      })),
      defenseLines: person.defenseLines,
      guiltAssessments: person.guiltAssessments.map((ga) => ({
        id: ga.id,
        guiltLevel: ga.guiltLevel,
        evidenceStrength: ga.evidenceStrength,
        forecast: ga.forecast,
        confidence: ga.confidence,
        mitigating: ga.mitigating,
        aggravating: ga.aggravating,
        episodeId: ga.episode?.id,
        episodeTitle: ga.episode?.title,
        analysisDate: ga.analysisDate,
      })),
    }));

    return NextResponse.json({
      persons: formattedPersons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Persons list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch persons', details: String(error) },
      { status: 500 }
    );
  }
}
