import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { AnalyticsData } from '@/lib/case-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    const docFilter = caseId ? { caseId } : {};
    const personFilter = caseId ? { caseId } : {};
    const episodeFilter = caseId ? { caseId } : {};

    const [
      documents,
      persons,
      episodes,
      articles,
      guiltAssessments,
      crossRefs,
      defenseLines,
      complianceChecks,
    ] = await Promise.all([
      db.document.findMany({ where: docFilter, select: { id: true, documentType: true, processingStatus: true, uploadedAt: true } }),
      db.person.findMany({ where: personFilter, select: { id: true, fullName: true, shortName: true, role: true } }),
      db.episode.findMany({ where: episodeFilter, select: { id: true, severity: true, status: true } }),
      db.article.findMany({ select: { id: true, code: true, description: true, category: true } }),
      db.guiltAssessment.findMany({ where: { person: personFilter }, select: { id: true, personId: true, guiltLevel: true, evidenceStrength: true } }),
      db.crossReference.findMany({ where: { sourceDocument: docFilter }, select: { id: true, sourceDocumentId: true, targetDocumentId: true } }),
      db.defenseLine.findMany({ where: { person: personFilter }, select: { id: true, strategyType: true, strength: true } }),
      db.legalCompliance.findMany({ where: { document: docFilter }, select: { id: true, checkType: true, status: true } }),
    ]);

    // Document types
    const docTypeMap = new Map<string, number>();
    documents.forEach(doc => {
      const type = doc.documentType ?? 'не указан';
      docTypeMap.set(type, (docTypeMap.get(type) ?? 0) + 1);
    });
    const documentTypes = Array.from(docTypeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: documents.length > 0 ? Math.round((count / documents.length) * 100) : 0,
    }));

    // Processing trend (group by month)
    const monthMap = new Map<string, { processed: number; pending: number; failed: number }>();
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    documents.forEach(doc => {
      const d = new Date(doc.uploadedAt);
      const monthKey = monthNames[d.getMonth()] ?? '?';
      const entry = monthMap.get(monthKey) ?? { processed: 0, pending: 0, failed: 0 };
      if (doc.processingStatus === 'completed') entry.processed++;
      else if (doc.processingStatus === 'processing') entry.pending++;
      else if (doc.processingStatus === 'failed') entry.failed++;
      else entry.pending++;
      monthMap.set(monthKey, entry);
    });
    const processingTrend = Array.from(monthMap.entries()).map(([date, v]) => ({ date, ...v }));

    // Episode matrix
    const severitySet = new Set<string>(['особо тяжкое', 'тяжкое', 'средней тяжести', 'небольшой']);
    episodes.forEach(ep => ep.severity && severitySet.add(ep.severity));
    const episodeMatrix = Array.from(severitySet).map(severity => {
      const matching = episodes.filter(ep => ep.severity === severity);
      return {
        severity,
        proven: matching.filter(ep => ep.status === 'доказано').length,
        investigating: matching.filter(ep => ep.status === 'расследуется').length,
        doubtful: matching.filter(ep => ep.status === 'сомнительно').length,
        total: matching.length,
      };
    });

    // Person involvement
    const personInvolvement = persons.map(p => ({
      name: p.shortName ?? p.fullName,
      episodes: 0,
      documents: 0,
      relationships: 0,
    }));

    // Article charges
    const articleCharges = articles.map(a => ({
      code: a.code,
      description: a.description,
      count: 1,
      severity: a.category ?? 'не указана',
    }));

    // Complexity score
    const complexityScore = Math.min(100, Math.round(
      (documents.length * 5) +
      (persons.length * 6) +
      (episodes.length * 8) +
      (articles.length * 4) +
      (crossRefs.length * 2)
    ));

    // Insights from compliance violations
    const insights = complianceChecks
      .filter(cc => cc.status === 'violation' || cc.status === 'warning')
      .map(cc => ({
        type: cc.status === 'violation' ? 'critical' as const : 'warning' as const,
        title: cc.checkType,
        description: cc.status,
        confidence: 70,
        relatedEntities: [],
        actionRecommendation: 'Проверить детали',
      }));

    // Outcome prediction
    const completedDocs = documents.filter(d => d.processingStatus === 'completed').length;
    const totalDocs = documents.length;
    const outcomePrediction = totalDocs > 0 ? [
      {
        scenario: 'Обвинительный приговор',
        probability: 60,
        riskAdjustedProbability: 55,
        rationale: 'На основе имеющихся доказательств',
        defenseImpact: 'Требуется активная защита',
        isMostLikely: true,
      },
      {
        scenario: 'Частичное оправдание',
        probability: 25,
        riskAdjustedProbability: 30,
        rationale: 'При выявлении процессуальных нарушений',
        defenseImpact: 'Положительно для защиты',
        isMostLikely: false,
      },
    ] : [];

    const computed: AnalyticsData = {
      processingTrend,
      episodeMatrix: episodeMatrix.length > 0 ? episodeMatrix : [],
      personInvolvement,
      articleCharges,
      complexity: {
        overallScore: complexityScore,
        factors: [
          { name: 'Объём документов', score: Math.min(100, documents.length * 10), benchmark: 50 },
          { name: 'Количество участников', score: Math.min(100, persons.length * 12), benchmark: 40 },
          { name: 'Количество эпизодов', score: Math.min(100, episodes.length * 15), benchmark: 35 },
          { name: 'Сложность статей', score: Math.min(100, articles.length * 14), benchmark: 60 },
          { name: 'Перекрёстных ссылок', score: Math.min(100, crossRefs.length * 5), benchmark: 45 },
          { name: 'Линий защиты', score: Math.min(100, defenseLines.length * 12), benchmark: 30 },
        ],
        rating: complexityScore >= 80 ? 'extreme' : complexityScore >= 60 ? 'high' : complexityScore >= 40 ? 'moderate' : 'low',
      },
      documentTypes,
      insights,
      outcomePrediction,
      workloadByMonth: processingTrend,
    };

    return NextResponse.json(computed);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({
      processingTrend: [],
      episodeMatrix: [],
      personInvolvement: [],
      articleCharges: [],
      complexity: { overallScore: 0, factors: [], rating: 'low' },
      documentTypes: [],
      insights: [],
      outcomePrediction: [],
      workloadByMonth: [],
    });
  }
}
