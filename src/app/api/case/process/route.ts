import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTextFromDocument, analyzeWithLLM } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Fetch document from database
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        processingQueue: { take: 1, orderBy: { queuePosition: 'asc' } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get caseId from the document for linking extracted entities
    const caseId = document.caseId;

    // Allow re-processing of completed or failed documents
    // (The reprocess route resets status first, but this is a safety net)

    // Update status to processing
    await db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'processing',
        processingError: null,
      },
    });

    // Update queue entry - step 1: extracting text
    const queueEntry = document.processingQueue[0];
    if (queueEntry) {
      await db.processingQueue.update({
        where: { id: queueEntry.id },
        data: { status: 'processing', startedAt: new Date(), progressPercent: 10, progressStep: 'Распознавание текста' },
      });
    }

    try {
      // Step 1: Extract text from document using VLM (base64 data URL)
      const extractedText = await extractTextFromDocument(document.filePath);

      // Save extracted text to document
      await db.document.update({
        where: { id: documentId },
        data: { extractedText },
      });

      // Update progress: text extraction done, starting AI analysis
      if (queueEntry) {
        await db.processingQueue.update({
          where: { id: queueEntry.id },
          data: { progressPercent: 40, progressStep: 'ИИ-анализ документа' },
        });
      }

      // Step 2: Analyze extracted text using LLM
      const analysisPrompt = `Analyze the following text from a criminal case document (уголовное дело) in the Russian Federation. Extract ONLY information directly relevant to the criminal case — ignore any irrelevant content, personal opinions, or unrelated data.

Extract and categorize the following information in JSON format:

TEXT:
${extractedText}

Return a JSON object with the following structure (respond ONLY with valid JSON, no additional text):
{
  "documentType": "type of document (обвинение, доказательство, показание, протокол, постановление, справка, etc.)",
  "documentDate": "date mentioned in the document (format: YYYY-MM-DD if possible, or as written)",
  "sourceReference": "reference number in case materials (e.g. 'том 1, л.д. 15')",
  "summary": "brief summary of the document content (2-3 sentences, only case-relevant facts)",
  "persons": [
    {
      "fullName": "full name of person mentioned in the case context",
      "shortName": "abbreviated name if mentioned",
      "role": "role in case (подозреваемый, обвиняемый, свидетель, потерпевший, эксперт, адвокат, следователь, судья)",
      "status": "current status if mentioned",
      "description": "brief description relevant to the case",
      "birthDate": "date of birth if mentioned",
      "occupation": "occupation if mentioned",
      "alias": "nickname/alias if mentioned",
      "mentionRole": "how this person appears in this specific document",
      "context": "context of mention in this document"
    }
  ],
  "episodes": [
    {
      "title": "episode title/description — only criminal episodes",
      "description": "full description of the criminal episode",
      "date": "date of episode if mentioned",
      "episodeNumber": "episode number in case structure",
      "severity": "severity classification",
      "relevance": "how this document relates to the episode"
    }
  ],
  "articles": [
    {
      "code": "article code (e.g. '159 УК РФ', '105 УК РФ')",
      "number": "just the number (e.g. '159', '105')",
      "codeType": "type of code (УК РФ, КоАП, etc.)",
      "description": "full description of the article",
      "category": "category of crime (тяжкое, особо тяжкое, средней тяжести, небольшое)",
      "punishmentMin": "minimum punishment",
      "punishmentMax": "maximum punishment",
      "context": "how this article appears in this document"
    }
  ],
  "crossReferences": [
    {
      "referenceText": "text that creates the link",
      "referenceType": "type (цитата, упоминание, доказательство, противоречие)",
      "context": "context of the reference",
      "note": "additional note"
    }
  ]
}

IMPORTANT: 
- Only include persons, episodes, and articles that are directly relevant to the criminal case.
- Exclude any unrelated personal information, opinions, or data not pertaining to the case.
- If a field is not mentioned in the document, set it to null rather than guessing.
- Do NOT include any mock/placeholder data.`;

      const analysisResult = await analyzeWithLLM(
        'You are a legal analyst specializing in Russian Federation criminal law. You analyze criminal case documents and extract ONLY case-relevant structured information. You must respond ONLY with valid JSON, no additional commentary or formatting. Exclude any irrelevant or unrelated data.',
        analysisPrompt
      );

      // Update progress: analysis done, saving to DB
      if (queueEntry) {
        await db.processingQueue.update({
          where: { id: queueEntry.id },
          data: { progressPercent: 70, progressStep: 'Сохранение данных в БД' },
        });
      }

      // Parse the LLM response as JSON
      let analysis: Record<string, unknown>;
      try {
        // Try to extract JSON from the response (it might contain markdown formatting)
        const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse LLM analysis:', parseError);
        console.error('Raw LLM response:', analysisResult);

        // Update document with error
        await db.document.update({
          where: { id: documentId },
          data: {
            processingStatus: 'failed',
            processingError: `Failed to parse AI analysis: ${String(parseError)}`,
          },
        });

        if (queueEntry) {
          await db.processingQueue.update({
            where: { id: queueEntry.id },
            data: {
              status: 'failed',
              error: `Failed to parse AI analysis`,
              completedAt: new Date(),
            },
          });
        }

        return NextResponse.json(
          {
            error: 'Failed to parse AI analysis result',
            rawResponse: analysisResult,
          },
          { status: 500 }
        );
      }

      // Step 3: Save extracted data to database, linking to the case
      const persons = (analysis.persons as Array<Record<string, unknown>>) || [];
      const episodes = (analysis.episodes as Array<Record<string, unknown>>) || [];
      const articles = (analysis.articles as Array<Record<string, unknown>>) || [];
      const crossReferences = (analysis.crossReferences as Array<Record<string, unknown>>) || [];

      // Update document metadata from analysis
      await db.document.update({
        where: { id: documentId },
        data: {
          documentType: analysis.documentType as string | null,
          documentDate: analysis.documentDate as string | null,
          sourceReference: analysis.sourceReference as string | null,
          summary: analysis.summary as string | null,
        },
      });

      // Create or update Person records and link to document AND case
      const personLinks = [];
      for (const personData of persons) {
        const fullName = personData.fullName as string;
        if (!fullName || fullName.trim() === '') continue; // Skip empty names

        // Check if person already exists in this case
        const existingPerson = await db.person.findFirst({
          where: { fullName, caseId: caseId || undefined },
        });

        let personId: string;
        if (existingPerson) {
          // Update existing person with new data from this document
          await db.person.update({
            where: { id: existingPerson.id },
            data: {
              role: (personData.role as string) || existingPerson.role,
              shortName: (personData.shortName as string) || existingPerson.shortName,
              status: (personData.status as string) || existingPerson.status,
              description: (personData.description as string) || existingPerson.description,
              birthDate: (personData.birthDate as string) || existingPerson.birthDate,
              occupation: (personData.occupation as string) || existingPerson.occupation,
              alias: (personData.alias as string) || existingPerson.alias,
            },
          });
          personId = existingPerson.id;
        } else {
          // Create new person linked to the case
          const newPerson = await db.person.create({
            data: {
              fullName,
              shortName: (personData.shortName as string) || null,
              role: (personData.role as string) || null,
              status: (personData.status as string) || null,
              description: (personData.description as string) || null,
              birthDate: (personData.birthDate as string) || null,
              occupation: (personData.occupation as string) || null,
              alias: (personData.alias as string) || null,
              isKolesnichenko: fullName.toLowerCase().includes('колесниченко'),
              caseId: caseId || null, // Link person to the case!
            },
          });
          personId = newPerson.id;
        }

        // Create PersonDocument link
        const personDoc = await db.personDocument.create({
          data: {
            personId,
            documentId,
            role: personData.mentionRole as string | null,
            context: personData.context as string | null,
          },
        });
        personLinks.push({ personId, personDocId: personDoc.id });
      }

      // Create Episode records linked to the case
      const episodeLinks = [];
      for (const episodeData of episodes) {
        const title = episodeData.title as string;
        if (!title || title.trim() === '') continue; // Skip empty titles

        // Check if episode already exists in this case
        const existingEpisode = await db.episode.findFirst({
          where: { title, caseId: caseId || undefined },
        });

        let episodeId: string;
        if (existingEpisode) {
          // Update existing episode
          await db.episode.update({
            where: { id: existingEpisode.id },
            data: {
              description: (episodeData.description as string) || existingEpisode.description,
              date: (episodeData.date as string) || existingEpisode.date,
              episodeNumber: (episodeData.episodeNumber as string) || existingEpisode.episodeNumber,
              severity: (episodeData.severity as string) || existingEpisode.severity,
            },
          });
          episodeId = existingEpisode.id;
        } else {
          // Create new episode linked to the case
          const newEpisode = await db.episode.create({
            data: {
              title,
              description: (episodeData.description as string) || '',
              date: (episodeData.date as string) || null,
              episodeNumber: (episodeData.episodeNumber as string) || null,
              severity: (episodeData.severity as string) || null,
              caseId: caseId || null, // Link episode to the case!
            },
          });
          episodeId = newEpisode.id;
        }

        // Create EpisodeDocument link
        const epDoc = await db.episodeDocument.create({
          data: {
            episodeId,
            documentId,
            relevance: episodeData.relevance as string | null,
          },
        });
        episodeLinks.push({ episodeId, epDocId: epDoc.id });

        // Link persons to episodes
        for (const pLink of personLinks) {
          await db.personEpisode.create({
            data: {
              personId: pLink.personId,
              episodeId,
              involvement: 'mentioned',
            },
          });
        }
      }

      // Create Article records and link to document
      const articleLinks = [];
      for (const articleData of articles) {
        const code = articleData.code as string;
        if (!code || code.trim() === '') continue; // Skip empty articles

        const existingArticle = await db.article.findFirst({
          where: { code },
        });

        let articleId: string;
        if (existingArticle) {
          articleId = existingArticle.id;
        } else {
          const newArticle = await db.article.create({
            data: {
              code,
              number: (articleData.number as string) || code.match(/\d+/)?.[0] || '',
              codeType: (articleData.codeType as string) || 'УК РФ',
              description: (articleData.description as string) || code,
              category: (articleData.category as string) || null,
              punishmentMin: (articleData.punishmentMin as string) || null,
              punishmentMax: (articleData.punishmentMax as string) || null,
              isCurrent: true,
            },
          });
          articleId = newArticle.id;
        }

        // Create DocumentArticle link
        const docArt = await db.documentArticle.create({
          data: {
            documentId,
            articleId,
            context: articleData.context as string | null,
          },
        });
        articleLinks.push({ articleId, docArtId: docArt.id });

        // Link articles to episodes
        for (const eLink of episodeLinks) {
          await db.episodeArticle.create({
            data: {
              episodeId: eLink.episodeId,
              articleId,
            },
          });
        }

        // Link persons to articles (charges)
        for (const pLink of personLinks) {
          await db.personArticle.create({
            data: {
              personId: pLink.personId,
              articleId,
              chargeStatus: 'обвиняется',
            },
          });
        }
      }

      // Create cross-references
      for (const refData of crossReferences) {
        const referenceText = refData.referenceText as string;
        if (!referenceText || referenceText.trim() === '') continue;

        const targetDoc = await db.document.findFirst({
          where: {
            caseId: caseId || undefined,
            OR: [
              { originalName: { contains: referenceText } },
              { sourceReference: { contains: referenceText } },
            ],
          },
        });

        if (targetDoc) {
          await db.crossReference.create({
            data: {
              sourceDocumentId: documentId,
              targetDocumentId: targetDoc.id,
              referenceText,
              referenceType: refData.referenceType as string | null,
              context: refData.context as string | null,
              note: refData.note as string | null,
            },
          });
        } else {
          // Self-reference as placeholder - will be updated when referenced document is uploaded
          await db.crossReference.create({
            data: {
              sourceDocumentId: documentId,
              targetDocumentId: documentId,
              referenceText,
              referenceType: refData.referenceType as string | null,
              context: refData.context as string | null,
              note: `Ожидает загрузки целевого документа: ${referenceText}`,
            },
          });
        }
      }

      // Update document status to completed
      await db.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'completed',
          processedAt: new Date(),
        },
      });

      // Update queue entry to completed
      if (queueEntry) {
        await db.processingQueue.update({
          where: { id: queueEntry.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            progressPercent: 100,
            progressStep: 'Завершено',
          },
        });
      }

      return NextResponse.json({
        success: true,
        documentId,
        caseId,
        extractedData: {
          documentType: analysis.documentType,
          documentDate: analysis.documentDate,
          sourceReference: analysis.sourceReference,
          summary: analysis.summary,
          personsCount: persons.length,
          episodesCount: episodes.length,
          articlesCount: articles.length,
          crossReferencesCount: crossReferences.length,
        },
      });
    } catch (processingError) {
      console.error('Processing error:', processingError);

      // Update document with error
      await db.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'failed',
          processingError: String(processingError),
        },
      });

      const qEntry = document.processingQueue[0];
      if (qEntry) {
        await db.processingQueue.update({
          where: { id: qEntry.id },
          data: {
            status: 'failed',
            error: String(processingError),
            completedAt: new Date(),
          },
        });
      }

      return NextResponse.json(
        { error: 'Processing failed', details: String(processingError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Process API error:', error);
    return NextResponse.json(
      { error: 'Failed to process document', details: String(error) },
      { status: 500 }
    );
  }
}
