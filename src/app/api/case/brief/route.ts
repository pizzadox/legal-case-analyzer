import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({
        caseNumber: '',
        caseTitle: '',
        summary: '',
        keyDefendants: [],
        keyEpisodes: [],
        keyEvidence: [],
        keyViolations: [],
        defenseSummary: '',
        prosecutionSummary: '',
        predictedOutcome: [],
        generatedAt: new Date().toISOString(),
        aiConfidence: 0,
      });
    }

    // Build case brief from real DB data

    const criminalCase = await db.criminalCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        caseTitle: true,
        defendantName: true,
        articles: true,
        status: true,
        createdAt: true,
      },
    });

    if (!criminalCase) {
      return NextResponse.json({
        caseNumber: '',
        caseTitle: '',
        summary: '',
        keyDefendants: [],
        keyEpisodes: [],
        keyEvidence: [],
        keyViolations: [],
        defenseSummary: '',
        prosecutionSummary: '',
        predictedOutcome: [],
        generatedAt: new Date().toISOString(),
        aiConfidence: 0,
      });
    }

    // Key defendants from persons
    const persons = await db.person.findMany({
      where: { caseId },
      select: { id: true, fullName: true, role: true, defenseStrategy: true, isKolesnichenko: true },
    });

    const personArticles = await db.personArticle.findMany({
      where: { person: { caseId } },
      include: {
        person: { select: { fullName: true } },
        article: { select: { code: true, description: true } },
      },
    });

    const keyDefendants = persons
      .filter(p => p.role === 'обвиняемый' || p.role === 'подозреваемый' || p.isKolesnichenko)
      .map(p => {
        const articlesForPerson = personArticles
          .filter(pa => pa.personId === p.id)
          .map(pa => pa.article.code);
        return {
          name: p.fullName,
          role: p.role ?? 'не указана',
          articles: articlesForPerson,
          guiltLevel: 'не определена',
        };
      });

    // Key episodes
    const episodes = await db.episode.findMany({
      where: { caseId },
      select: { id: true, title: true, date: true, severity: true, status: true },
    });

    const keyEpisodes = episodes.map(e => ({
      title: e.title,
      date: e.date ?? 'не указана',
      severity: e.severity ?? 'не указана',
      status: e.status ?? 'не указан',
    }));

    // Key evidence from completed documents
    const completedDocs = await db.document.findMany({
      where: { caseId, processingStatus: 'completed' },
      select: { id: true, originalName: true, documentType: true, summary: true },
      take: 5,
    });

    const keyEvidence = completedDocs.map(d => ({
      description: d.summary ?? d.originalName,
      source: d.originalName,
      strength: 'moderate' as const,
    }));

    // Key violations from compliance checks
    const violations = await db.legalCompliance.findMany({
      where: { document: { caseId }, status: { in: ['violation', 'warning'] } },
      include: {
        article: { select: { code: true } },
        document: { select: { originalName: true } },
      },
    });

    const keyViolations = violations.map(v => ({
      description: v.description,
      legalBasis: v.legalBasis ?? v.article?.code ?? 'не указана',
      severity: v.status === 'violation' ? 'critical' as const : 'major' as const,
    }));

    // Defense summary
    const kolesnichenko = persons.find(p => p.isKolesnichenko);
    const defenseLines = await db.defenseLine.findMany({
      where: { personId: kolesnichenko?.id },
    });

    const defenseSummary = kolesnichenko?.defenseStrategy
      ?? (defenseLines.length > 0
        ? defenseLines.map(dl => dl.title).join(', ')
        : 'Линия защиты не сформирована');

    // Prosecution summary
    const prosecutionSummary = criminalCase.articles
      ? `Обвинение по ${criminalCase.articles}`
      : 'Данные обвинения не указаны';

    // Predicted outcome (basic assessment based on data)
    const predictedOutcome = [];
    if (completedDocs.length > 0 && keyDefendants.length > 0) {
      predictedOutcome.push({
        scenario: 'Обвинительный приговор',
        probability: 60,
        description: 'Наиболее вероятный исход при наличии доказательств',
      });
      predictedOutcome.push({
        scenario: 'Частичное оправдание',
        probability: 25,
        description: 'Возможно при наличии процессуальных нарушений',
      });
      predictedOutcome.push({
        scenario: 'Оправдательный приговор',
        probability: 15,
        description: 'Маловероятно при текущих доказательствах',
      });
    }

    const aiConfidence = completedDocs.length > 0
      ? Math.min(Math.round(completedDocs.length * 10 + violations.length * 5 + defenseLines.length * 8), 85)
      : 0;

    const summary = criminalCase.defendantName
      ? `Уголовное дело № ${criminalCase.caseNumber} в отношении ${criminalCase.defendantName}${criminalCase.articles ? ` по ${criminalCase.articles}` : ''}. ${episodes.length} преступных эпизодов, ${completedDocs.length} обработанных документов, ${violations.length} выявленных нарушений.`
      : `Уголовное дело № ${criminalCase.caseNumber}. ${episodes.length} преступных эпизодов, ${completedDocs.length} обработанных документов.`;

    return NextResponse.json({
      caseNumber: criminalCase.caseNumber,
      caseTitle: criminalCase.caseTitle,
      summary,
      keyDefendants,
      keyEpisodes,
      keyEvidence,
      keyViolations,
      defenseSummary,
      prosecutionSummary,
      predictedOutcome,
      generatedAt: new Date().toISOString(),
      aiConfidence,
    });
  } catch (error) {
    console.error('Case brief error:', error);
    return NextResponse.json({
      caseNumber: '',
      caseTitle: '',
      summary: '',
      keyDefendants: [],
      keyEpisodes: [],
      keyEvidence: [],
      keyViolations: [],
      defenseSummary: '',
      prosecutionSummary: '',
      predictedOutcome: [],
      generatedAt: new Date().toISOString(),
      aiConfidence: 0,
    });
  }
}
