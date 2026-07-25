import { db } from './db'
import { extractText } from './extraction'
import { analyzeWithLLM } from './zai'

// Analysis result structure from LLM
interface AnalysisResult {
  summary: string
  documentType: string
  documentDate: string | null
  sourceReference: string | null
  persons: Array<{
    fullName: string
    shortName: string | null
    role: string | null
    context: string | null
  }>
  episodes: Array<{
    title: string
    description: string
    date: string | null
    severity: string | null
    personsInvolved: string[]
    articles: string[]
  }>
  articles: Array<{
    code: string
    description: string
    category: string | null
  }>
}

/**
 * System prompt for LLM document analysis
 */
const ANALYSIS_SYSTEM_PROMPT = `You are a legal analyst specializing in Russian Federation criminal law (уголовное право РФ). You analyze criminal case documents and extract structured information with high accuracy and attention to detail.

You must respond ONLY with valid JSON, no additional commentary, explanations, or formatting like markdown code blocks. Output raw JSON only.

Your analysis must be thorough - extract every person mentioned, every episode described, every article of law referenced, and provide accurate summaries in Russian.`

/**
 * User prompt template for LLM document analysis
 */
function buildAnalysisPrompt(extractedText: string): string {
  return `Analyze the following text from a criminal case document (уголовное дело) in the Russian Federation. Extract and categorize the following information.

TEXT:
${extractedText}

Return a JSON object with EXACTLY this structure (respond ONLY with valid JSON):
{
  "summary": "Краткое описание документа (2-3 предложения)",
  "documentType": "тип документа (обвинение, показание, протокол, экспертиза, постановление, справка, доказательство, etc.)",
  "documentDate": "дата документа в формате YYYY-MM-DD или как указано",
  "sourceReference": "ссылка на материалы дела (например, 'том 1, л.д. 15-30')",
  "persons": [
    {
      "fullName": "Полное ФИО человека",
      "shortName": "Сокращённое ФИО если указано",
      "role": "роль в деле (обвиняемый, подозреваемый, свидетель, потерпевший, эксперт, адвокат, следователь, судья, понятой)",
      "context": "Как этот человек упомянут в данном документе"
    }
  ],
  "episodes": [
    {
      "title": "Название/описание эпизода",
      "description": "Полное описание эпизода",
      "date": "Дата эпизода если указана",
      "severity": "Категория тяжести (тяжкое, особо тяжкое, средней тяжести, небольшое)",
      "personsInvolved": ["ФИО участвующих лиц"],
      "articles": ["ст. XXX ч.X УК РФ"]
    }
  ],
  "articles": [
    {
      "code": "Полный код статьи (например, 'ст. 159 ч.3 УК РФ')",
      "description": "Описание статьи",
      "category": "Категория (тяжкое, особо тяжкое, средней тяжести, небольшое)"
    }
  ]
}

IMPORTANT:
- Extract ALL persons mentioned in the document, not just the main ones
- For each person, specify their exact role as mentioned in the document
- Identify ALL episodes (incidents/crimes) described in the document
- List ALL articles of criminal law (УК РФ) referenced
- If dates are mentioned, extract them accurately
- The summary should capture the essence of the document content
- Return ONLY valid JSON, no other text`
}

/**
 * Parse LLM response as JSON, handling potential markdown wrapping
 */
function parseAnalysisResponse(rawResponse: string): AnalysisResult {
  console.log('[Processor] Parsing LLM analysis response...')

  // Try to extract JSON from the response (it might contain markdown formatting)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    console.log('[Processor] Successfully parsed analysis JSON')

    // Validate required fields
    return {
      summary: parsed.summary || '',
      documentType: parsed.documentType || 'неизвестно',
      documentDate: parsed.documentDate || null,
      sourceReference: parsed.sourceReference || null,
      persons: Array.isArray(parsed.persons) ? parsed.persons : [],
      episodes: Array.isArray(parsed.episodes) ? parsed.episodes : [],
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
    }
  } catch (parseError) {
    console.error('[Processor] JSON parse error:', parseError)
    console.error('[Processor] Raw response:', rawResponse.substring(0, 500))
    throw new Error(`Failed to parse JSON from LLM response: ${String(parseError)}`)
  }
}

/**
 * Process a single document through the full pipeline
 */
export async function processDocument(queueId: string, documentId: string): Promise<void> {
  console.log(`[Processor] Starting processing: queueId=${queueId}, documentId=${documentId}`)

  // Step 1: Update ProcessingQueue status to processing
  await db.processingQueue.update({
    where: { id: queueId },
    data: { status: 'processing', startedAt: new Date() },
  })

  // Step 2: Update Document processingStatus to processing
  await db.document.update({
    where: { id: documentId },
    data: { processingStatus: 'processing', processingError: null },
  })

  try {
    // Step 3: Fetch the full document record
    const document = await db.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      throw new Error(`Document not found: ${documentId}`)
    }

    console.log(`[Processor] Processing file: ${document.originalName} (${document.filePath}, ${document.mimeType}, ${document.fileSize} bytes)`)

    // Step 4: Extract text from the file
    let extractedText: string
    try {
      extractedText = await extractText(document.filePath, document.mimeType)
      console.log(`[Processor] Extracted ${extractedText.length} characters of text`)
    } catch (extractionError) {
      throw new Error(`Text extraction failed: ${String(extractionError)}`)
    }

    // Save extracted text to document immediately
    await db.document.update({
      where: { id: documentId },
      data: { extractedText },
    })

    // Step 5: Use LLM to analyze the extracted text
    console.log('[Processor] Sending text to LLM for analysis...')
    let analysisResult: AnalysisResult
    try {
      const analysisPrompt = buildAnalysisPrompt(extractedText)
      const rawResponse = await analyzeWithLLM(ANALYSIS_SYSTEM_PROMPT, analysisPrompt)
      analysisResult = parseAnalysisResponse(rawResponse)
      console.log('[Processor] LLM analysis complete:', {
        type: analysisResult.documentType,
        persons: analysisResult.persons.length,
        episodes: analysisResult.episodes.length,
        articles: analysisResult.articles.length,
      })
    } catch (analysisError) {
      throw new Error(`LLM analysis failed: ${String(analysisError)}`)
    }

    // Step 6: Create database records from analysis results

    // 6a: Create Person records and PersonDocument links
    const personLinks: Array<{ personId: string; role: string | null }> = []
    for (const personData of analysisResult.persons) {
      if (!personData.fullName || personData.fullName.trim().length === 0) continue

      // Check if person already exists (by fullName)
      const existingPerson = await db.person.findFirst({
        where: { fullName: personData.fullName },
      })

      let personId: string
      if (existingPerson) {
        // Update existing person with any new information
        await db.person.update({
          where: { id: existingPerson.id },
          data: {
            shortName: personData.shortName || existingPerson.shortName,
            role: personData.role || existingPerson.role,
            isKolesnichenko: personData.fullName.toLowerCase().includes('колесниченко'),
          },
        })
        personId = existingPerson.id
      } else {
        // Create new person
        const newPerson = await db.person.create({
          data: {
            fullName: personData.fullName,
            shortName: personData.shortName,
            role: personData.role,
            isKolesnichenko: personData.fullName.toLowerCase().includes('колесниченко'),
          },
        })
        personId = newPerson.id
      }

      // Create PersonDocument link
      await db.personDocument.create({
        data: {
          personId,
          documentId,
          role: personData.role,
          context: personData.context,
        },
      })

      personLinks.push({ personId, role: personData.role })
    }

    // 6b: Create Episode records and EpisodeDocument links
    const episodeLinks: Array<{ episodeId: string }> = []
    for (const episodeData of analysisResult.episodes) {
      if (!episodeData.title || episodeData.title.trim().length === 0) continue

      // Check if episode already exists
      const existingEpisode = await db.episode.findFirst({
        where: { title: episodeData.title },
      })

      let episodeId: string
      if (existingEpisode) {
        // Update existing episode
        await db.episode.update({
          where: { id: existingEpisode.id },
          data: {
            description: episodeData.description || existingEpisode.description,
            date: episodeData.date || existingEpisode.date,
            severity: episodeData.severity || existingEpisode.severity,
          },
        })
        episodeId = existingEpisode.id
      } else {
        // Create new episode
        const newEpisode = await db.episode.create({
          data: {
            title: episodeData.title,
            description: episodeData.description,
            date: episodeData.date,
            severity: episodeData.severity,
            caseId: document.caseId,
          },
        })
        episodeId = newEpisode.id
      }

      // Create EpisodeDocument link
      await db.episodeDocument.create({
        data: {
          episodeId,
          documentId,
          relevance: `Эпизод: ${episodeData.title}`,
        },
      })

      episodeLinks.push({ episodeId })

      // Link persons to episodes
      for (const personLink of personLinks) {
        // Check if this person is involved in this episode
        const isInvolved = episodeData.personsInvolved?.some(name =>
          name.toLowerCase().includes(personLink.role?.toLowerCase() || '') ||
          true // All persons in the document are potentially involved
        )

        // Check if PersonEpisode link already exists
        const existingLink = await db.personEpisode.findFirst({
          where: {
            personId: personLink.personId,
            episodeId,
          },
        })

        if (!existingLink) {
          await db.personEpisode.create({
            data: {
              personId: personLink.personId,
              episodeId,
              involvement: personLink.role,
            },
          })
        }
      }
    }

    // 6c: Create Article records and DocumentArticle links
    const articleLinks: Array<{ articleId: string }> = []
    for (const articleData of analysisResult.articles) {
      if (!articleData.code || articleData.code.trim().length === 0) continue

      // Parse article number from code (e.g., "ст. 159 ч.3 УК РФ" -> "159")
      const numberMatch = articleData.code.match(/(\d+)/)
      const articleNumber = numberMatch ? numberMatch[1] : articleData.code

      // Check if article already exists
      const existingArticle = await db.article.findFirst({
        where: { code: articleData.code },
      })

      let articleId: string
      if (existingArticle) {
        articleId = existingArticle.id
      } else {
        // Create new article
        const newArticle = await db.article.create({
          data: {
            code: articleData.code,
            number: articleNumber,
            codeType: 'УК РФ',
            description: articleData.description,
            category: articleData.category,
            isCurrent: true,
          },
        })
        articleId = newArticle.id
      }

      // Create DocumentArticle link
      await db.documentArticle.create({
        data: {
          documentId,
          articleId,
          context: `Статья упомянута в документе: ${document.originalName}`,
        },
      })

      articleLinks.push({ articleId })

      // Link articles to episodes
      for (const episodeLink of episodeLinks) {
        // Check if EpisodeArticle link already exists
        const existingLink = await db.episodeArticle.findFirst({
          where: {
            episodeId: episodeLink.episodeId,
            articleId,
          },
        })

        if (!existingLink) {
          await db.episodeArticle.create({
            data: {
              episodeId: episodeLink.episodeId,
              articleId,
            },
          })
        }
      }

      // Link persons to articles (charges)
      for (const personLink of personLinks) {
        // Check if PersonArticle link already exists
        const existingLink = await db.personArticle.findFirst({
          where: {
            personId: personLink.personId,
            articleId,
          },
        })

        if (!existingLink) {
          await db.personArticle.create({
            data: {
              personId: personLink.personId,
              articleId,
              chargeStatus: 'обвиняется',
            },
          })
        }
      }
    }

    // Step 7: Update Document with final results
    await db.document.update({
      where: { id: documentId },
      data: {
        extractedText,
        summary: analysisResult.summary,
        documentType: analysisResult.documentType,
        documentDate: analysisResult.documentDate,
        sourceReference: analysisResult.sourceReference,
        processingStatus: 'completed',
        processedAt: new Date(),
      },
    })

    // Step 8: Update ProcessingQueue to completed
    await db.processingQueue.update({
      where: { id: queueId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    console.log(`[Processor] Document processing completed successfully: ${documentId}`)
    console.log(`[Processor] Summary: ${analysisResult.summary}`)
    console.log(`[Processor] Type: ${analysisResult.documentType}`)
    console.log(`[Processor] Persons: ${analysisResult.persons.length}, Episodes: ${analysisResult.episodes.length}, Articles: ${analysisResult.articles.length}`)

  } catch (error) {
    console.error(`[Processor] Processing failed for document ${documentId}:`, error)

    // Update Document with error
    await db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'failed',
        processingError: String(error),
      },
    })

    // Update ProcessingQueue with error
    await db.processingQueue.update({
      where: { id: queueId },
      data: {
        status: 'failed',
        error: String(error),
        completedAt: new Date(),
      },
    })

    throw error
  }
}
