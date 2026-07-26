import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({
        score: 0,
        factors: {
          documentProcessing: { value: 0, label: 'Обработка документов', tooltip: 'Нет данных', status: 'neutral' },
          complianceRate: { value: 0, label: 'Правовое соответствие', tooltip: 'Нет данных', status: 'neutral' },
          evidenceStrength: { value: 0, label: 'Сила доказательств', tooltip: 'Нет данных', status: 'neutral' },
          defenseCoverage: { value: 0, label: 'Линия защиты', tooltip: 'Нет данных', status: 'neutral' },
        },
      });
    }

    // Calculate health score from real DB data

    // 1. Document processing factor
    const totalDocs = await db.document.count({ where: { caseId } });
    const completedDocs = await db.document.count({ where: { caseId, processingStatus: 'completed' } });
    const failedDocs = await db.document.count({ where: { caseId, processingStatus: 'failed' } });
    const docProcessingValue = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
    const docStatus = docProcessingValue >= 70 ? 'good' : docProcessingValue >= 40 ? 'warning' : 'bad';

    // 2. Compliance rate factor
    const totalCompliance = await db.legalCompliance.count({
      where: { document: { caseId } },
    });
    const compliantChecks = await db.legalCompliance.count({
      where: { document: { caseId }, status: 'compliant' },
    });
    const complianceValue = totalCompliance > 0 ? Math.round((compliantChecks / totalCompliance) * 100) : 0;
    const complianceStatus = complianceValue >= 70 ? 'good' : complianceValue >= 40 ? 'warning' : 'bad';

    // 3. Evidence strength factor
    const guiltAssessments = await db.guiltAssessment.findMany({
      where: { person: { caseId } },
    });
    const strongEvidence = guiltAssessments.filter(g => g.evidenceStrength === 'strong').length;
    const evidenceValue = guiltAssessments.length > 0
      ? Math.round((strongEvidence / guiltAssessments.length) * 100)
      : 0;
    const evidenceStatus = evidenceValue >= 50 ? 'good' : evidenceValue >= 25 ? 'warning' : 'bad';

    // 4. Defense coverage factor
    const defenseLines = await db.defenseLine.findMany({
      where: { person: { caseId } },
    });
    const strongDefense = defenseLines.filter(d => d.strength === 'strong').length;
    const defenseValue = defenseLines.length > 0
      ? Math.round((strongDefense / defenseLines.length) * 100)
      : 0;
    const defenseStatus = defenseValue >= 50 ? 'good' : defenseValue >= 25 ? 'warning' : 'bad';

    // Overall score = weighted average
    const score = Math.round(
      docProcessingValue * 0.25 +
      complianceValue * 0.25 +
      evidenceValue * 0.25 +
      defenseValue * 0.25
    );

    return NextResponse.json({
      score,
      factors: {
        documentProcessing: { value: docProcessingValue, label: 'Обработка документов', tooltip: `${completedDocs}/${totalDocs} документов обработано`, status: docStatus },
        complianceRate: { value: complianceValue, label: 'Правовое соответствие', tooltip: `${compliantChecks}/${totalCompliance} проверок пройдено`, status: complianceStatus },
        evidenceStrength: { value: evidenceValue, label: 'Сила доказательств', tooltip: `${strongEvidence}/${guiltAssessments.length} сильных доказательств`, status: evidenceStatus },
        defenseCoverage: { value: defenseValue, label: 'Линия защиты', tooltip: `${strongDefense}/${defenseLines.length} сильных стратегий`, status: defenseStatus },
      },
    });
  } catch (error) {
    console.error('Health score error:', error);
    return NextResponse.json({
      score: 0,
      factors: {
        documentProcessing: { value: 0, label: 'Обработка документов', tooltip: 'Ошибка', status: 'neutral' },
        complianceRate: { value: 0, label: 'Правовое соответствие', tooltip: 'Ошибка', status: 'neutral' },
        evidenceStrength: { value: 0, label: 'Сила доказательств', tooltip: 'Ошибка', status: 'neutral' },
        defenseCoverage: { value: 0, label: 'Линия защиты', tooltip: 'Ошибка', status: 'neutral' },
      },
    });
  }
}
