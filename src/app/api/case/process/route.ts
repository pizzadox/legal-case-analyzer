import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTextFromPDF, analyzeWithLLM } from '@/lib/zai';

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

    if (document.processingStatus === 'completed') {
      return NextResponse.json(
        { error: 'Document already processed', documentId },
        { status: 400 }
      );
    }

    // Update status to processing
    await db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'processing',
        processingError: null,
      },
    });

    // Update queue entry
    const queueEntry = document.processingQueue[0];
    if (queueEntry) {
      await db.processingQueue.update({
        where: { id: queueEntry.id },
        data: { status: 'processing', startedAt: new Date() },
      });
    }

    try {
      // Step 1: Extract text from PDF using VLM
      const extractedText = await extractTextFromPDF(document.filePath);

      // Save extracted text to document
      await db.document.update({
        where: { id: documentId },
        data: { extractedText },
      });

      // Step 2: Analyze extracted text using LLM
      const analysisPrompt = `Analyze the following text from a criminal case document (уголовное дело) in the Russian Federation. Extract and categorize the following information in JSON format:

TEXT:
${extractedText}

Return a JSON object with the following structure (respond ONLY with valid JSON, no additional text):
{
  "documentType": "type of document (обвинение, доказательство, показание, протокол, постановление, справка, etc.)",
  "documentDate": "date mentioned in the document (format: YYYY-MM-DD if possible, or as written)",
  "sourceReference": "reference number in case materials (e.g. 'том 1, л.д. 15')",
  "summary": "brief summary of the document content (2-3 sentences)",
  "persons": [
    {
      "fullName": "full name of person",
      "shortName": "abbreviated name if mentioned",
      "role": "role in case (подозреваемый, обвиняемый, свидетель, потерпевший, эксперт, адвокат, следователь, судья)",
      "status": "current status if mentioned",
      "description": "brief description",
      "birthDate": "date of birth if mentioned",
      "occupation": "occupation if mentioned",
      "alias": "nickname/alias if mentioned",
      "mentionRole": "how this person appears in this specific document",
      "context": "context of mention in this document"
    }
  ],
  "locations": [
    {
      "name": "name of location",
      "address": "full address if available",
      "type": "type of location (место преступления, место жительства, место работы, etc.)",
      "description": "description/context",
      "context": "how this location appears in this document"
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
  "episodes": [
    {
      "title": "episode title/description",
      "description": "full description",
      "date": "date of episode if mentioned",
      "episodeNumber": "episode number in case structure",
      "severity": "severity classification",
      "relevance": "how this document relates to the episode"
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
}`;

      const analysisResult = await analyzeWithLLM(
        'You are a legal analyst specializing in Russian Federation criminal law. You analyze criminal case documents and extract structured information. You must respond ONLY with valid JSON, no additional commentary or formatting.',
        analysisPrompt
      );

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

      // Step 3: Save extracted data to database
      const persons = (analysis.persons as Array<Record<string, unknown>>) || [];
      const locations = (analysis.locations as Array<Record<string, unknown>>) || [];
      const articles = (analysis.articles as Array<Record<string, unknown>>) || [];
      const episodes = (analysis.episodes as Array<Record<string, unknown>>) || [];
      const crossReferences = (analysis.crossReferences as Array<Record<string, unknown>>) || [];

      // Create or update Person records and link to document
      const personLinks = [];
      for (const personData of persons) {
        // Check if person already exists
        const existingPerson = await db.person.findFirst({
          where: { fullName: personData.fullName as string },
        });

        let personId: string;
        if (existingPerson) {
          // Update existing person
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
          // Create new person
          const newPerson = await db.person.create({
            data: {
              fullName: personData.fullName as string,
              shortName: personData.shortName as string | null,
              role: personData.role as string | null,
              status: personData.status as string | null,
              description: personData.description as string | null,
              birthDate: personData.birthDate as string | null,
              occupation: personData.occupation as string | null,
              alias: personData.alias as string | null,
              isKolesnichenko: (personData.fullName as string).toLowerCase().includes('колесниченко'),
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

      // Create Location records and link to document
      const locationLinks = [];
      for (const locationData of locations) {
        const existingLocation = await db.location.findFirst({
          where: { name: locationData.name as string },
        });

        let locationId: string;
        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          const newLocation = await db.location.create({
            data: {
              name: locationData.name as string,
              address: locationData.address as string | null,
              type: locationData.type as string | null,
              description: locationData.description as string | null,
            },
          });
          locationId = newLocation.id;
        }

        // Create DocumentLocation link
        const docLoc = await db.documentLocation.create({
          data: {
            documentId,
            locationId,
            context: locationData.context as string | null,
          },
        });
        locationLinks.push({ locationId, docLocId: docLoc.id });
      }

      // Create Article records and link to document
      const articleLinks = [];
      for (const articleData of articles) {
        const existingArticle = await db.article.findFirst({
          where: { code: articleData.code as string },
        });

        let articleId: string;
        if (existingArticle) {
          articleId = existingArticle.id;
        } else {
          const newArticle = await db.article.create({
            data: {
              code: articleData.code as string,
              number: articleData.number as string,
              codeType: (articleData.codeType as string) || 'УК РФ',
              description: articleData.description as string,
              category: articleData.category as string | null,
              punishmentMin: articleData.punishmentMin as string | null,
              punishmentMax: articleData.punishmentMax as string | null,
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
      }

      // Create Episode records and link to document and persons
      const episodeLinks = [];
      for (const episodeData of episodes) {
        const existingEpisode = await db.episode.findFirst({
          where: { title: episodeData.title as string },
        });

        let episodeId: string;
        if (existingEpisode) {
          episodeId = existingEpisode.id;
        } else {
          const newEpisode = await db.episode.create({
            data: {
              title: episodeData.title as string,
              description: episodeData.description as string,
              date: episodeData.date as string | null,
              episodeNumber: episodeData.episodeNumber as string | null,
              severity: episodeData.severity as string | null,
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
          const personDocEntry = await db.personDocument.findUnique({
            where: { id: pLink.personDocId },
          });
          if (personDocEntry) {
            await db.personEpisode.create({
              data: {
                personId: pLink.personId,
                episodeId,
                involvement: personDocEntry.role,
              },
            });
          }
        }

        // Link locations to episodes
        for (const lLink of locationLinks) {
          await db.episodeLocation.create({
            data: {
              episodeId,
              locationId: lLink.locationId,
              context: null,
            },
          });
        }

        // Link articles to episodes
        for (const aLink of articleLinks) {
          await db.episodeArticle.create({
            data: {
              episodeId,
              articleId: aLink.articleId,
            },
          });
        }
      }

      // Link persons to articles (charges)
      for (const pLink of personLinks) {
        for (const aLink of articleLinks) {
          await db.personArticle.create({
            data: {
              personId: pLink.personId,
              articleId: aLink.articleId,
              chargeStatus: 'обвиняется',
            },
          });
        }
      }

      // Create cross-references (we'll link sourceDocument but targetDocument requires matching)
      for (const refData of crossReferences) {
        // Try to find a matching target document by reference text
        const targetDoc = await db.document.findFirst({
          where: {
            OR: [
              { originalName: { contains: refData.referenceText as string } },
              { sourceReference: { contains: refData.referenceText as string } },
            ],
          },
        });

        if (targetDoc) {
          await db.crossReference.create({
            data: {
              sourceDocumentId: documentId,
              targetDocumentId: targetDoc.id,
              referenceText: refData.referenceText as string,
              referenceType: refData.referenceType as string | null,
              context: refData.context as string | null,
              note: refData.note as string | null,
            },
          });
        } else {
          // Create cross-reference with the same document as target (placeholder)
          // Will be updated when the referenced document is uploaded
          await db.crossReference.create({
            data: {
              sourceDocumentId: documentId,
              targetDocumentId: documentId, // Self-reference as placeholder
              referenceText: refData.referenceText as string,
              referenceType: refData.referenceType as string | null,
              context: refData.context as string | null,
              note: `Ожидает загрузки целевого документа: ${refData.referenceText}`,
            },
          });
        }
      }

      // Update document status to completed
      await db.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'completed',
          documentType: analysis.documentType as string | null,
          documentDate: analysis.documentDate as string | null,
          sourceReference: analysis.sourceReference as string | null,
          summary: analysis.summary as string | null,
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
          },
        });
      }

      return NextResponse.json({
        success: true,
        documentId,
        extractedData: {
          documentType: analysis.documentType,
          documentDate: analysis.documentDate,
          sourceReference: analysis.sourceReference,
          summary: analysis.summary,
          personsCount: persons.length,
          locationsCount: locations.length,
          articlesCount: articles.length,
          episodesCount: episodes.length,
          crossReferencesCount: crossReferences.length,
          personLinks,
          locationLinks,
          articleLinks,
          episodeLinks,
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

      const queueEntry = document.processingQueue[0];
      if (queueEntry) {
        await db.processingQueue.update({
          where: { id: queueEntry.id },
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
