import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeWithLLM } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    // Find the person marked as Kolesnichenko
    const kolesnichenko = await db.person.findFirst({
      where: { isKolesnichenko: true },
    });

    if (!kolesnichenko) {
      return NextResponse.json(
        { error: 'Person marked as Kolesnichenko not found. Please process documents first to identify Kolesnichenko.' },
        { status: 404 }
      );
    }

    // Gather all data related to Kolesnichenko
    const personDocuments = await db.personDocument.findMany({
      where: { personId: kolesnichenko.id },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            documentType: true,
            documentDate: true,
            summary: true,
            extractedText: true,
            sourceReference: true,
          },
        },
      },
    });

    const personEpisodes = await db.personEpisode.findMany({
      where: { personId: kolesnichenko.id },
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
    });

    const personArticles = await db.personArticle.findMany({
      where: { personId: kolesnichenko.id },
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
            isCurrent: true,
          },
        },
      },
    });

    // Get guilt assessments
    const guiltAssessments = await db.guiltAssessment.findMany({
      where: { personId: kolesnichenko.id },
      include: {
        episode: {
          select: { id: true, title: true },
        },
      },
    });

    // Get compliance checks for related documents
    const complianceChecks = await db.legalCompliance.findMany({
      where: {
        documentId: { in: personDocuments.map((pd) => pd.document.id) },
      },
      include: {
        article: { select: { code: true, description: true } },
        document: { select: { originalName: true } },
      },
    });

    // Build context for LLM analysis
    let defenseContext = `## Данные по обвиняемому Колесниченко:\n`;
    defenseContext += `ФИО: ${kolesnichenko.fullName}\n`;
    defenseContext += `Роль: ${kolesnichenko.role}\n`;
    defenseContext += `Статус: ${kolesnichenko.status}\n`;
    defenseContext += `Описание: ${kolesnichenko.description || 'нет описания'}\n`;
    defenseContext += `Дата рождения: ${kolesnichenko.birthDate || 'не указана'}\n`;
    defenseContext += `Род занятий: ${kolesnichenko.occupation || 'не указан'}\n\n`;

    defenseContext += `## Документы, mentioning Колесниченко:\n`;
    for (const pd of personDocuments) {
      defenseContext += `- ${pd.document.originalName} (${pd.document.documentType || 'не указан'}, дата: ${pd.document.documentDate || 'не указана'}): ${pd.document.summary || 'нет сводки'}\n`;
      defenseContext += `  Роль в документе: ${pd.role || 'не указана'}, контекст: ${pd.context || 'не указан'}\n`;
      if (pd.document.extractedText) {
        // Include relevant portions of text (max 300 chars per document)
        defenseContext += `  Текст (фрагмент): ${pd.document.extractedText.substring(0, 300)}...\n`;
      }
    }

    defenseContext += `\n## Эпизоды, связанные с Колесниченко:\n`;
    for (const pe of personEpisodes) {
      defenseContext += `- ${pe.episode.title} (дата: ${pe.episode.date || 'не указана'}, тяжесть: ${pe.episode.severity || 'не указана'}, статус: ${pe.episode.status || 'не указан'}): ${pe.episode.description}\n`;
      defenseContext += `  Вовлеченность: ${pe.involvement || 'не указана'}\n`;
    }

    defenseContext += `\n## Статьи обвинения:\n`;
    for (const pa of personArticles) {
      defenseContext += `- ${pa.article.code} (${pa.article.category || 'не указана'}): ${pa.article.description}\n`;
      defenseContext += `  Наказание: ${pa.article.punishmentMin || 'не указано'} - ${pa.article.punishmentMax || 'не указано'}\n`;
      defenseContext += `  Статус обвинения: ${pa.chargeStatus || 'не указан'}\n`;
      defenseContext += `  Действующая статья: ${pa.article.isCurrent ? 'да' : 'нет'}\n`;
    }

    defenseContext += `\n## Оценки виновности:\n`;
    for (const ga of guiltAssessments) {
      defenseContext += `- Эпизод "${ga.episode?.title || 'не указан'}": степень виновности=${ga.guiltLevel}, сила доказательств=${ga.evidenceStrength}\n`;
      defenseContext += `  Прогноз: ${ga.forecast || 'не указан'}, доверие: ${ga.confidence || 'не указано'}\n`;
      defenseContext += `  Смягчающие: ${ga.mitigating || 'не указаны'}, Отягчающие: ${ga.aggravating || 'не указаны'}\n`;
    }

    defenseContext += `\n## Результаты проверок compliance:\n`;
    for (const cc of complianceChecks) {
      defenseContext += `- ${cc.checkType} (${cc.document.originalName}): ${cc.status} - ${cc.description}\n`;
      defenseContext += `  Рекомендация: ${cc.recommendation || 'не указана'}\n`;
      defenseContext += `  Правовая основа: ${cc.legalBasis || 'не указана'}\n`;
      if (cc.article) {
        defenseContext += `  Связанная статья: ${cc.article.code}: ${cc.article.description}\n`;
      }
    }

    // Generate defense analysis using LLM
    const defensePrompt = `На основе следующих материалов уголовного дела, проведите подробный анализ линий защиты для Колесниченко. Определите возможные стратегии защиты, оцените их силу, вероятность успеха и приведите конкретные аргументы.

ДАННЫЕ ДЕЛА:
${defenseContext}

Вы должны вернуть результат в формате JSON (ОТВЕЧАЙТЕ ТОЛЬКО JSON, без дополнительного текста):
{
  "overallAssessment": "общая оценка ситуации защиты (1-2 предложения)",
  "primaryStrategy": {
    "type": "тип основной стратегии (innocence, mitigating, procedural_violation, alibi, reclassification, lack_of_evidence, statute_limitations)",
    "title": "название стратегии",
    "description": "подробное описание",
    "strength": "оценка силы (strong, moderate, weak)",
    "probability": "оценка вероятности успеха",
    "evidence": "поддерживающие доказательства",
    "articleReferences": "связанные статьи"
  },
  "strategyVariants": [
    {
      "type": "тип стратегии",
      "title": "название",
      "description": "описание",
      "strength": "оценка силы (strong, moderate, weak)",
      "probability": "оценка вероятности",
      "evidence": "доказательства",
      "articleReferences": "связанные статьи"
    }
  ],
  "strengths": ["список сильных сторон дела для защиты"],
  "weaknesses": ["список слабых сторон дела для защиты"],
  "recommendations": ["список рекомендаций для адвоката"],
  "proceduralViolations": ["список выявленных procedural нарушений, если есть"],
  "riskAssessment": {
    "overallRisk": "общая оценка риска (high, moderate, low)",
    "worstCase": "наихудший сценарий",
    "bestCase": "наилучший сценарий",
    "mostLikely": "наиболее вероятный результат"
  }
}`;

    const defenseAnalysis = await analyzeWithLLM(
      'Вы — опытный адвокат по уголовным делам в Российской Федерации. Вы специализируесь на защите обвиняемых и проведении стратегического анализа линий защиты. Вы должны давать профессиональные юридические оценки с конкретными ссылками на статьи закона и материалы дела. Отвечайте ТОЛЬКО в формате JSON.',
      defensePrompt
    );

    // Parse the LLM response
    let analysis: Record<string, unknown>;
    try {
      const jsonMatch = defenseAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in defense analysis response');
      }
    } catch (parseError) {
      console.error('Failed to parse defense analysis:', parseError);
      return NextResponse.json(
        {
          error: 'Failed to parse defense analysis',
          rawResponse: defenseAnalysis,
          personId: kolesnichenko.id,
        },
        { status: 500 }
      );
    }

    // Save DefenseLine records
    const primaryStrategy = analysis.primaryStrategy as Record<string, unknown>;
    const strategyVariants = (analysis.strategyVariants as Array<Record<string, unknown>>) || [];

    // Create primary defense line
    if (primaryStrategy) {
      await db.defenseLine.create({
        data: {
          personId: kolesnichenko.id,
          strategyType: primaryStrategy.type as string,
          title: primaryStrategy.title as string,
          description: primaryStrategy.description as string,
          evidence: primaryStrategy.evidence as string | null,
          strength: primaryStrategy.strength as string | null,
          probability: primaryStrategy.probability as string | null,
          articleReferences: primaryStrategy.articleReferences as string | null,
        },
      });
    }

    // Create variant defense lines
    for (const variant of strategyVariants) {
      await db.defenseLine.create({
        data: {
          personId: kolesnichenko.id,
          strategyType: variant.type as string,
          title: variant.title as string,
          description: variant.description as string,
          evidence: variant.evidence as string | null,
          strength: variant.strength as string | null,
          probability: variant.probability as string | null,
          articleReferences: variant.articleReferences as string | null,
        },
      });
    }

    // Update person defense strategy
    await db.person.update({
      where: { id: kolesnichenko.id },
      data: {
        defenseStrategy: analysis.overallAssessment as string,
      },
    });

    // Get all saved defense lines for this person
    const savedDefenseLines = await db.defenseLine.findMany({
      where: { personId: kolesnichenko.id },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({
      success: true,
      personId: kolesnichenko.id,
      personFullName: kolesnichenko.fullName,
      overallAssessment: analysis.overallAssessment,
      primaryStrategy: primaryStrategy,
      strategyVariants,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      proceduralViolations: analysis.proceduralViolations,
      riskAssessment: analysis.riskAssessment,
      defenseLines: savedDefenseLines,
    });
  } catch (error) {
    console.error('Defense analysis error:', error);
    return NextResponse.json(
      { error: 'Defense analysis failed', details: String(error) },
      { status: 500 }
    );
  }
}
