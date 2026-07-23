import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/case/cases - list all criminal cases
export async function GET() {
  try {
    const cases = await db.criminalCase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { documents: true, persons: true, episodes: true },
        },
      },
    });

    const formatted = cases.map(c => ({
      id: c.id,
      caseNumber: c.caseNumber,
      caseTitle: c.caseTitle,
      defendantName: c.defendantName,
      articles: c.articles,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      documentCount: c._count.documents,
      personCount: c._count.persons,
      episodeCount: c._count.episodes,
    }));

    // If no cases exist yet, seed a default one
    if (formatted.length === 0) {
      const defaultCase = await db.criminalCase.create({
        data: {
          caseNumber: '№ 2024-00145',
          caseTitle: 'Уголовное дело по обвинению Колесниченко Д.А.',
          defendantName: 'Колесниченко Д.А.',
          articles: 'ст. 159 ч.3, ст. 160 ч.2 УК РФ',
          status: 'active',
        },
      });

      formatted.push({
        id: defaultCase.id,
        caseNumber: defaultCase.caseNumber,
        caseTitle: defaultCase.caseTitle,
        defendantName: defaultCase.defendantName,
        articles: defaultCase.articles,
        status: defaultCase.status,
        createdAt: defaultCase.createdAt,
        updatedAt: defaultCase.updatedAt,
        documentCount: 0,
        personCount: 0,
        episodeCount: 0,
      });
    }

    return NextResponse.json({ cases: formatted });
  } catch (error) {
    console.error('Cases list error:', error);
    return NextResponse.json({ error: 'Ошибка получения списка дел' }, { status: 500 });
  }
}

// POST /api/case/cases - create a new criminal case
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseNumber, caseTitle, defendantName, articles } = body;

    if (!caseNumber || !caseTitle) {
      return NextResponse.json(
        { error: 'Номер и название дела обязательны' },
        { status: 400 }
      );
    }

    const newCase = await db.criminalCase.create({
      data: {
        caseNumber,
        caseTitle,
        defendantName: defendantName || null,
        articles: articles || null,
        status: 'active',
      },
    });

    return NextResponse.json({
      id: newCase.id,
      caseNumber: newCase.caseNumber,
      caseTitle: newCase.caseTitle,
      defendantName: newCase.defendantName,
      articles: newCase.articles,
      status: newCase.status,
      createdAt: newCase.createdAt,
    });
  } catch (error) {
    console.error('Create case error:', error);
    return NextResponse.json({ error: 'Ошибка создания дела' }, { status: 500 });
  }
}
