import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Sentencing calculator derived from real article data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json([]);
    }

    // Get articles linked to persons in this case
    const personArticles = await db.personArticle.findMany({
      where: { person: { caseId } },
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
    });

    const sentencingData = personArticles.map(pa => ({
      articleCode: pa.article.code,
      description: pa.article.description,
      punishmentMin: 0,
      punishmentMax: 0,
      baseSentence: 0,
      mitigatingFactors: [],
      aggravatingFactors: [],
      estimatedSentence: 0,
      estimatedFine: 0,
      additionalSanctions: [],
      precedentCases: [],
    }));

    return NextResponse.json(sentencingData);
  } catch (error) {
    console.error('Sentencing error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { articleCode, caseId } = body || {};

    const filter = caseId ? { person: { caseId } } : {};
    let articleFilter = {};
    if (articleCode) {
      articleFilter = { article: { code: { contains: String(articleCode) } } };
    }

    const personArticles = await db.personArticle.findMany({
      where: { ...filter, ...articleFilter },
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
    });

    const sentencingData = personArticles.map(pa => ({
      articleCode: pa.article.code,
      description: pa.article.description,
      punishmentMin: 0,
      punishmentMax: 0,
      baseSentence: 0,
      mitigatingFactors: [],
      aggravatingFactors: [],
      estimatedSentence: 0,
      estimatedFine: 0,
      additionalSanctions: [],
      precedentCases: [],
    }));

    return NextResponse.json(sentencingData.length > 0 ? sentencingData : []);
  } catch (error) {
    console.error('Sentencing POST error:', error);
    return NextResponse.json([]);
  }
}
