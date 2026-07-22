import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeWithLLM } from '@/lib/zai';

interface ComplianceRequest {
  documentId: string;
  checkTypes?: string[]; // article_applicability, procedure_compliance, evidence_admissibility, statute_limitations
}

export async function POST(request: NextRequest) {
  try {
    const body: ComplianceRequest = await request.json();
    const { documentId, checkTypes } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const defaultCheckTypes = [
      'article_applicability',
      'procedure_compliance',
      'evidence_admissibility',
      'statute_limitations',
    ];
    const typesToCheck = checkTypes || defaultCheckTypes;

    // Fetch document with all related data
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        persons: { include: { person: true } },
        episodes: { include: { episode: true } },
        articles: { include: { article: true } },
        locations: { include: { location: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (!document.extractedText) {
      return NextResponse.json(
        { error: 'Document has no extracted text. Please process it first.' },
        { status: 400 }
      );
    }

    // Build context for compliance check
    let complianceContext = `## Документ для проверки:\n`;
    complianceContext += `Файл: ${document.originalName}\n`;
    complianceContext += `Тип: ${document.documentType || 'не указан'}\n`;
    complianceContext += `Дата: ${document.documentDate || 'не указана'}\n`;
    complianceContext += `Источник: ${document.sourceReference || 'не указан'}\n`;
    complianceContext += `Сводка: ${document.summary || 'нет сводки'}\n\n`;

    complianceContext += `## Текст документа (фрагмент):\n`;
    complianceContext += `${document.extractedText.substring(0, 2000)}\n\n`;

    complianceContext += `## Лица, упомянутые в документе:\n`;
    for (const pd of document.persons) {
      complianceContext += `- ${pd.person.fullName} (${pd.person.role || 'не указана'}, статус: ${pd.person.status || 'не указан'}, роль в документе: ${pd.role || 'не указана'})\n`;
    }

    complianceContext += `\n## Статьи, referenced в документе:\n`;
    for (const da of document.articles) {
      complianceContext += `- ${da.article.code} (${da.article.category || 'не указана'}): ${da.article.description}\n`;
      complianceContext += `  Наказание: ${da.article.punishmentMin || 'не указано'} - ${da.article.punishmentMax || 'не указано'}\n`;
      complianceContext += `  Действующая: ${da.article.isCurrent ? 'да' : 'нет'}\n`;
      complianceContext += `  Контекст в документе: ${da.context || 'не указан'}\n`;
    }

    complianceContext += `\n## Эпизоды, связанные с документом:\n`;
    for (const ed of document.episodes) {
      complianceContext += `- ${ed.episode.title} (дата: ${ed.episode.date || 'не указана'}, тяжесть: ${ed.episode.severity || 'не указана'}): ${ed.episode.description}\n`;
    }

    // Build check-specific instructions
    const checkTypeInstructions: Record<string, string> = {
      article_applicability: 'Проверьте правильность применения статей уголовного кодекса. Проверьте: актуальность статьи на момент преступления, правильность квалификации, соответствие тяжести преступления статье, правильность определения части статьи.',
      procedure_compliance: 'Проверьте procedural compliance (соблюдение процедуры). Проверьте: правильность оформления документа, наличие необходимых реквизитов, соблюдение сроков, правильность уведомления сторон, соблюдение прав обвиняемого.',
      evidence_admissibility: 'Проверьте допустимость доказательств (evidence admissibility). Проверьте: законность получения доказательств, соблюдение требований к доказательствам по УПК РФ, наличие цепочки доказательств, допустимость источников.',
      statute_limitations: 'Проверьте сроки давности (statute of limitations). Проверьте: не истек ли срок давности по каждой статье, правильность исчисления сроков, наличие обстоятельств, прерывающих или приостанавливающих сроки.',
    };

    const selectedCheckInstructions = typesToCheck
      .map((type) => checkTypeInstructions[type] || '')
      .filter((i) => i)
      .join('\n\n');

    // Use LLM for compliance analysis
    const compliancePrompt = `Проведите юридическую compliance проверку документа из уголовного дела Российской Федерации. Проверьте по следующим направлениям:

${selectedCheckInstructions}

ДАННЫЕ ДЛЯ ПРОВЕРКИ:
${complianceContext}

Вы должны вернуть результат в формате JSON (ОТВЕЧАЙТЕ ТОЛЬКО JSON, без дополнительного текста):
{
  "checks": [
    {
      "checkType": "article_applicability | procedure_compliance | evidence_admissibility | statute_limitations",
      "status": "compliant | violation | warning | needs_review",
      "description": "описание результата проверки",
      "recommendation": "рекомендуемое действие",
      "legalBasis": "правовая основа (статья закона, пункт)",
      "articleCode": "связанная статья (если applicable, e.g. '159 УК РФ')",
      "severity": "high | medium | low - степень серьезности проблемы"
    }
  ],
  "overallCompliance": "compliant | violation | warning | needs_review - общая оценка compliance",
  "summary": "краткое общее описание compliance статуса документа",
  "criticalIssues": ["список критических проблем, если есть"],
  "recommendations": ["общие рекомендации"]
}`;

    const complianceResult = await analyzeWithLLM(
      'Вы — юрист-эксперт по уголовному процессу Российской Федерации. Вы специализируесь на compliance проверке документов уголовных дел. Вы проверяете документы на соответствие УПК РФ, УК РФ и другим нормативным актам. Отвечайте ТОЛЬКО в формате JSON.',
      compliancePrompt
    );

    // Parse the LLM response
    let parsedResult: Record<string, unknown>;
    try {
      const jsonMatch = complianceResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in compliance check response');
      }
    } catch (parseError) {
      console.error('Failed to parse compliance result:', parseError);
      return NextResponse.json(
        {
          error: 'Failed to parse compliance check result',
          rawResponse: complianceResult,
          documentId,
        },
        { status: 500 }
      );
    }

    // Save LegalCompliance records
    const checks = (parsedResult.checks as Array<Record<string, unknown>>) || [];
    const savedChecks = [];

    for (const check of checks) {
      // Find or create the related article
      let articleId: string | null = null;
      if (check.articleCode) {
        const article = await db.article.findFirst({
          where: { code: { contains: check.articleCode as string } },
        });
        if (article) {
          articleId = article.id;
        }
      }

      const savedCheck = await db.legalCompliance.create({
        data: {
          documentId,
          articleId,
          checkType: check.checkType as string,
          status: check.status as string,
          description: check.description as string,
          recommendation: check.recommendation as string | null,
          legalBasis: check.legalBasis as string | null,
        },
      });

      savedChecks.push({
        id: savedCheck.id,
        checkType: savedCheck.checkType,
        status: savedCheck.status,
        description: savedCheck.description,
        recommendation: savedCheck.recommendation,
        legalBasis: savedCheck.legalBasis,
        articleCode: check.articleCode,
        severity: check.severity,
      });
    }

    return NextResponse.json({
      success: true,
      documentId,
      documentOriginalName: document.originalName,
      checks: savedChecks,
      overallCompliance: parsedResult.overallCompliance,
      summary: parsedResult.summary,
      criticalIssues: parsedResult.criticalIssues,
      recommendations: parsedResult.recommendations,
      totalChecks: savedChecks.length,
      violations: savedChecks.filter((c) => c.status === 'violation').length,
      warnings: savedChecks.filter((c) => c.status === 'warning').length,
      compliant: savedChecks.filter((c) => c.status === 'compliant').length,
      needsReview: savedChecks.filter((c) => c.status === 'needs_review').length,
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    return NextResponse.json(
      { error: 'Compliance check failed', details: String(error) },
      { status: 500 }
    );
  }
}
