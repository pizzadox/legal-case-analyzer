import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeWithLLM } from '@/lib/zai';

interface QARequest {
  question: string;
  contextType?: string;
  contextId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QARequest = await request.json();
    const { question, contextType, contextId } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Gather context from the database
    let contextData = '';

    // Get all processed documents
    const documents = await db.document.findMany({
      where: { processingStatus: 'completed' },
      select: {
        id: true,
        originalName: true,
        documentType: true,
        documentDate: true,
        summary: true,
        sourceReference: true,
        extractedText: true,
      },
      take: 10,
    });

    // Get persons
    const persons = await db.person.findMany({
      select: {
        id: true,
        fullName: true,
        role: true,
        status: true,
        isKolesnichenko: true,
        description: true,
      },
    });

    // Get episodes
    const episodes = await db.episode.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        severity: true,
        status: true,
      },
    });

    // Get articles
    const articles = await db.article.findMany({
      select: {
        id: true,
        code: true,
        description: true,
        category: true,
        punishmentMin: true,
        punishmentMax: true,
      },
    });

    // Get cross-references
    const crossRefs = await db.crossReference.findMany({
      include: {
        sourceDocument: { select: { originalName: true } },
        targetDocument: { select: { originalName: true } },
      },
      take: 20,
    });

    // If contextType is specific, focus on that entity
    if (contextType === 'person_specific' && contextId) {
      const person = await db.person.findUnique({
        where: { id: contextId },
        include: {
          documents: { include: { document: { select: { originalName: true, summary: true, extractedText: true } } } },
          episodes: { include: { episode: { select: { title: true, description: true } } } },
          articles: { include: { article: { select: { code: true, description: true } } } },
          guiltAssessments: true,
          defenseLines: true,
        },
      });
      if (person) {
        contextData += `\n## Контекст по лицу: ${person.fullName}\n`;
        contextData += `Роль: ${person.role}\n`;
        contextData += `Статус: ${person.status}\n`;
        contextData += `Описание: ${person.description}\n`;
        contextData += `Документы:\n${person.documents.map((d) => `- ${d.document.originalName}: ${d.document.summary}`).join('\n')}\n`;
        contextData += `Эпизоды:\n${person.episodes.map((e) => `- ${e.episode.title}: ${e.episode.description}`).join('\n')}\n`;
        contextData += `Статьи обвинения:\n${person.articles.map((a) => `- ${a.article.code}: ${a.article.description}`).join('\n')}\n`;
        if (person.guiltAssessments.length > 0) {
          contextData += `Оценка виновности:\n${person.guiltAssessments.map((g) => `- Степень: ${g.guiltLevel}, Доказательства: ${g.evidenceStrength}`).join('\n')}\n`;
        }
        if (person.defenseLines.length > 0) {
          contextData += `Линии защиты:\n${person.defenseLines.map((d) => `- ${d.title}: ${d.description}`).join('\n')}\n`;
        }
      }
    } else if (contextType === 'episode_specific' && contextId) {
      const episode = await db.episode.findUnique({
        where: { id: contextId },
        include: {
          persons: { include: { person: { select: { fullName: true, role: true } } } },
          locations: { include: { location: { select: { name: true, address: true } } } },
          articles: { include: { article: { select: { code: true, description: true } } } },
          documents: { include: { document: { select: { originalName: true, summary: true } } } },
        },
      });
      if (episode) {
        contextData += `\n## Контекст по эпизоду: ${episode.title}\n`;
        contextData += `Описание: ${episode.description}\n`;
        contextData += `Дата: ${episode.date}\n`;
        contextData += `Тяжесть: ${episode.severity}\n`;
        contextData += `Лица:\n${episode.persons.map((p) => `- ${p.person.fullName} (${p.person.role}, вовлеченность: ${p.involvement})`).join('\n')}\n`;
        contextData += `Места:\n${episode.locations.map((l) => `- ${l.location.name} (${l.location.address})`).join('\n')}\n`;
        contextData += `Статьи:\n${episode.articles.map((a) => `- ${a.article.code}: ${a.article.description}`).join('\n')}\n`;
        contextData += `Документы:\n${episode.documents.map((d) => `- ${d.document.originalName}: ${d.document.summary}`).join('\n')}\n`;
      }
    } else if (contextType === 'article_specific' && contextId) {
      const article = await db.article.findUnique({
        where: { id: contextId },
        include: {
          persons: { include: { person: { select: { fullName: true, role: true } } } },
          episodes: { include: { episode: { select: { title: true, description: true } } } },
          documents: { include: { document: { select: { originalName: true, summary: true } } } },
          complianceChecks: true,
        },
      });
      if (article) {
        contextData += `\n## Контекст по статье: ${article.code}\n`;
        contextData += `Описание: ${article.description}\n`;
        contextData += `Категория: ${article.category}\n`;
        contextData += `Наказание: ${article.punishmentMin} - ${article.punishmentMax}\n`;
        contextData += `Обвиняемые лица:\n${article.persons.map((p) => `- ${p.person.fullName} (${p.person.role}, статус: ${p.chargeStatus})`).join('\n')}\n`;
        contextData += `Связанные эпизоды:\n${article.episodes.map((e) => `- ${e.episode.title}`).join('\n')}\n`;
        contextData += `Документы:\n${article.documents.map((d) => `- ${d.document.originalName}`).join('\n')}\n`;
        if (article.complianceChecks.length > 0) {
          contextData += `Проверки compliance:\n${article.complianceChecks.map((c) => `- ${c.checkType}: ${c.status} - ${c.description}`).join('\n')}\n`;
        }
      }
    } else {
      // General context - build from all data
      contextData += '## Документы дела:\n';
      for (const doc of documents) {
        contextData += `- ${doc.originalName} (${doc.documentType || 'не указан'}, дата: ${doc.documentDate || 'не указана'}): ${doc.summary || 'нет сводки'}\n`;
        // Include a portion of extracted text for context (max 500 chars per doc)
        if (doc.extractedText) {
          const textSnippet = doc.extractedText.substring(0, 500);
          contextData += `  Текст (фрагмент): ${textSnippet}...\n`;
        }
      }

      contextData += '\n## Лица, упомянутые в деле:\n';
      for (const person of persons) {
        contextData += `- ${person.fullName} (${person.role || 'не указана'}, статус: ${person.status || 'не указан'}${person.isKolesnichenko ? ', КОЛЕСНИЧЕНКО' : ''}): ${person.description || 'нет описания'}\n`;
      }

      contextData += '\n## Эпизоды дела:\n';
      for (const episode of episodes) {
        contextData += `- ${episode.title} (дата: ${episode.date || 'не указана'}, тяжесть: ${episode.severity || 'не указана'}): ${episode.description}\n`;
      }

      contextData += '\n## Статьи обвинения:\n';
      for (const article of articles) {
        contextData += `- ${article.code} (${article.category || 'не указана'}): ${article.description}. Наказание: ${article.punishmentMin || 'не указано'} - ${article.punishmentMax || 'не указано'}\n`;
      }

      contextData += '\n## перекрестные ссылки:\n';
      for (const cr of crossRefs) {
        contextData += `- ${cr.sourceDocument.originalName} → ${cr.targetDocument.originalName}: ${cr.referenceText} (${cr.referenceType || 'не указан'})\n`;
      }
    }

    // Use LLM to answer the question with context
    const answerPrompt = `На основе следующей информации из уголовного дела, ответьте на вопрос пользователя. Ответ должен быть подробным, с ссылками на конкретные документы, статьи, лица и эпизоды. Если информации недостаточно для полного ответа, укажите это.

КОНТЕКСТ ДЕЛА:
${contextData}

ВОПРОС: ${question}`;

    const answer = await analyzeWithLLM(
      'Вы — AI-ассистент для анализа уголовных дел в Российской Федерации. Вы помогаете юристам и адвокатам анализировать материалы дела, отвечать на вопросы по делу, давать ссылки на конкретные документы, статьи закона и эпизоды. Отвечайте на русском языке. Будьте точными и профессиональными. Всегда указывайте источники информации.',
      answerPrompt
    );

    // Create ChatMessage record
    const chatMessage = await db.chatMessage.create({
      data: {
        question,
        answer,
        contextType: contextType || 'general',
        contextId: contextId || null,
      },
    });

    // Link relevant documents to the chat message
    for (const doc of documents.slice(0, 5)) {
      await db.chatMessageDocument.create({
        data: {
          chatMessageId: chatMessage.id,
          documentId: doc.id,
        },
      });
    }

    // Link relevant persons to the chat message
    for (const person of persons.slice(0, 5)) {
      await db.chatMessagePerson.create({
        data: {
          chatMessageId: chatMessage.id,
          personId: person.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      chatMessageId: chatMessage.id,
      question,
      answer,
      contextType: contextType || 'general',
      referencedDocuments: documents.slice(0, 5).map((d) => ({
        id: d.id,
        originalName: d.originalName,
        summary: d.summary,
      })),
      referencedPersons: persons.slice(0, 5).map((p) => ({
        id: p.id,
        fullName: p.fullName,
        role: p.role,
      })),
    });
  } catch (error) {
    console.error('Q&A error:', error);
    return NextResponse.json(
      { error: 'Q&A failed', details: String(error) },
      { status: 500 }
    );
  }
}
