import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Risk assessment computed from real DB data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({
        overallRisk: 0,
        riskLevel: 'low',
        factors: {
          evidenceRisk: { score: 0, label: 'Риск доказательств', description: 'Нет данных' },
          proceduralRisk: { score: 0, label: 'Процессуальный риск', description: 'Нет данных' },
          defenseRisk: { score: 0, label: 'Риск защиты', description: 'Нет данных' },
          complianceRisk: { score: 0, label: 'Риск соответствия', description: 'Нет данных' },
          timelineRisk: { score: 0, label: 'Сроковой риск', description: 'Нет данных' },
        },
        matrix: [],
        mitigationStrategies: [],
      });
    }

    // Evidence risk — based on guilt assessments
    const guiltAssessments = await db.guiltAssessment.findMany({
      where: { person: { caseId } },
    });
    const highGuilt = guiltAssessments.filter(g => g.guiltLevel === 'high').length;
    const evidenceRiskScore = guiltAssessments.length > 0
      ? Math.round((highGuilt / guiltAssessments.length) * 100)
      : 0;

    // Procedural risk — based on compliance violations
    const violations = await db.legalCompliance.count({
      where: { document: { caseId }, status: 'violation' },
    });
    const totalCompliance = await db.legalCompliance.count({
      where: { document: { caseId } },
    });
    const proceduralRiskScore = totalCompliance > 0
      ? Math.round((violations / totalCompliance) * 100)
      : 0;

    // Defense risk — based on weak defense lines
    const defenseLines = await db.defenseLine.findMany({
      where: { person: { caseId } },
    });
    const weakDefense = defenseLines.filter(d => d.strength === 'weak').length;
    const defenseRiskScore = defenseLines.length > 0
      ? Math.round((weakDefense / defenseLines.length) * 100)
      : 50;

    // Compliance risk — based on warning status
    const warnings = await db.legalCompliance.count({
      where: { document: { caseId }, status: 'warning' },
    });
    const complianceRiskScore = totalCompliance > 0
      ? Math.round(((violations + warnings) / totalCompliance) * 100)
      : 0;

    // Timeline risk — based on episode dates
    const episodes = await db.episode.findMany({
      where: { caseId, date: { not: null } },
    });
    const now = new Date();
    const overdueEpisodes = episodes.filter(e => e.date && new Date(e.date) < now).length;
    const timelineRiskScore = episodes.length > 0
      ? Math.round((overdueEpisodes / episodes.length) * 100)
      : 0;

    const overallRisk = Math.round(
      evidenceRiskScore * 0.3 +
      proceduralRiskScore * 0.2 +
      defenseRiskScore * 0.2 +
      complianceRiskScore * 0.15 +
      timelineRiskScore * 0.15
    );

    const riskLevel = overallRisk >= 80 ? 'critical'
      : overallRisk >= 60 ? 'high'
      : overallRisk >= 40 ? 'moderate' : 'low';

    return NextResponse.json({
      overallRisk,
      riskLevel,
      factors: {
        evidenceRisk: { score: evidenceRiskScore, label: 'Риск доказательств', description: `${highGuilt}/${guiltAssessments.length} высоких уровней виновности` },
        proceduralRisk: { score: proceduralRiskScore, label: 'Процессуальный риск', description: `${violations} нарушений из ${totalCompliance} проверок` },
        defenseRisk: { score: defenseRiskScore, label: 'Риск защиты', description: `${weakDefense}/${defenseLines.length} слабых стратегий` },
        complianceRisk: { score: complianceRiskScore, label: 'Риск соответствия', description: `${violations + warnings} проблем из ${totalCompliance} проверок` },
        timelineRisk: { score: timelineRiskScore, label: 'Сроковой риск', description: `${overdueEpisodes}/${episodes.length} просроченных этапов` },
      },
      matrix: [
        { likelihood: evidenceRiskScore, impact: 80, category: 'Доказательства' },
        { likelihood: proceduralRiskScore, impact: 70, category: 'Процессуальные' },
        { likelihood: defenseRiskScore, impact: 60, category: 'Защита' },
      ],
      mitigationStrategies: defenseLines.slice(0, 3).map(dl => ({
        strategy: dl.title,
        riskReduction: dl.strength === 'strong' ? 30 : dl.strength === 'moderate' ? 15 : 5,
        priority: dl.strength === 'strong' ? 'high' : dl.strength === 'moderate' ? 'medium' : 'low',
      })),
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json({
      overallRisk: 0,
      riskLevel: 'low',
      factors: {
        evidenceRisk: { score: 0, label: 'Риск доказательств', description: 'Ошибка' },
        proceduralRisk: { score: 0, label: 'Процессуальный риск', description: 'Ошибка' },
        defenseRisk: { score: 0, label: 'Риск защиты', description: 'Ошибка' },
        complianceRisk: { score: 0, label: 'Риск соответствия', description: 'Ошибка' },
        timelineRisk: { score: 0, label: 'Сроковой риск', description: 'Ошибка' },
      },
      matrix: [],
      mitigationStrategies: [],
    });
  }
}
