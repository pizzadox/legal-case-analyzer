// Database seed script for the Criminal Case Management System.
// Run with: `bun prisma/seed.ts` (also configured as `prisma.seed` in package.json).
//
// This script wipes all existing rows (in FK-safe order) and then inserts the
// mock data exported from `src/lib/mock-data.ts`. Mock IDs (e.g. "doc1", "p1",
// "ep1", "art1", "loc1") are remapped to the actual Prisma-generated IDs by
// keeping per-entity lookup maps that are populated as records are created.

import { PrismaClient } from '@prisma/client'
import type { ArticleData, LocationData } from '../src/lib/case-store'
import {
  mockChatMessages,
  mockComplianceChecks,
  mockDefenseLines,
  mockDocuments,
  mockEpisodes,
  mockGuiltAssessments,
  mockPersons,
  mockProcessingQueue,
} from '../src/lib/mock-data'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an ISO date string (or null) to a Date (or null). */
function toDate(iso: string | null): Date | null {
  return iso ? new Date(iso) : null
}

// Lookup maps: mockId -> actual Prisma-generated ID
const docIdMap: Record<string, string> = {}
const personIdMap: Record<string, string> = {}
const episodeIdMap: Record<string, string> = {}
const articleIdMap: Record<string, string> = {}
const locationIdMap: Record<string, string> = {}

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------

async function wipeAll(): Promise<void> {
  // Delete children first to respect foreign-key constraints.
  await prisma.chatMessagePerson.deleteMany()
  await prisma.chatMessageDocument.deleteMany()
  await prisma.chatMessage.deleteMany()

  await prisma.personArticle.deleteMany()
  await prisma.episodeArticle.deleteMany()
  await prisma.episodeLocation.deleteMany()
  await prisma.personEpisode.deleteMany()
  await prisma.documentArticle.deleteMany()
  await prisma.documentLocation.deleteMany()
  await prisma.episodeDocument.deleteMany()
  await prisma.personDocument.deleteMany()

  await prisma.processingQueue.deleteMany()
  await prisma.legalCompliance.deleteMany()
  await prisma.defenseLine.deleteMany()
  await prisma.guiltAssessment.deleteMany()
  await prisma.crossReference.deleteMany()

  await prisma.episode.deleteMany()
  await prisma.article.deleteMany()
  await prisma.location.deleteMany()
  await prisma.person.deleteMany()
  await prisma.document.deleteMany()
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

async function seedDocuments(): Promise<void> {
  for (const d of mockDocuments) {
    const created = await prisma.document.create({
      data: {
        fileName: d.fileName,
        originalName: d.originalName,
        // mock-data has no filePath; synthesise one consistent with the upload
        // directory used by the API.
        filePath: `/uploads/${d.fileName}`,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        extractedText: d.extractedText,
        summary: d.summary,
        documentDate: d.documentDate,
        documentType: d.documentType,
        sourceReference: d.sourceReference,
        processingStatus: d.processingStatus,
        processingError: d.processingError,
        uploadedAt: new Date(d.uploadedAt),
        processedAt: toDate(d.processedAt),
      },
    })
    docIdMap[d.id] = created.id
  }
  console.log(`  • documents: ${mockDocuments.length}`)
}

async function seedPersons(): Promise<void> {
  for (const p of mockPersons) {
    const created = await prisma.person.create({
      data: {
        fullName: p.fullName,
        shortName: p.shortName,
        role: p.role,
        status: p.status,
        description: p.description,
        birthDate: p.birthDate,
        occupation: p.occupation,
        alias: p.alias,
        // mockPersons already flags Колесниченко with isKolesnichenko:true.
        isKolesnichenko: p.isKolesnichenko,
        defenseStrategy: p.defenseStrategy,
      },
    })
    personIdMap[p.id] = created.id
  }
  console.log(`  • persons: ${mockPersons.length}`)
}

async function seedArticles(): Promise<void> {
  // Articles are constructed from mockEpisodes' nested `articles` arrays.
  // Each episode references one article (or none for ep3); we deduplicate by
  // the mock articleId so each Article is created exactly once.
  const articlesById = new Map<string, ArticleData>()
  for (const ep of mockEpisodes) {
    for (const ea of ep.articles) {
      if (!articlesById.has(ea.articleId)) {
        articlesById.set(ea.articleId, ea.article)
      }
    }
  }

  for (const [mockId, art] of articlesById) {
    const created = await prisma.article.create({
      data: {
        code: art.code,
        number: art.number,
        codeType: art.codeType,
        description: art.description,
        category: art.category,
        punishmentMin: art.punishmentMin,
        punishmentMax: art.punishmentMax,
        isCurrent: art.isCurrent,
      },
    })
    articleIdMap[mockId] = created.id
  }
  console.log(`  • articles: ${articlesById.size}`)
}

async function seedLocations(): Promise<void> {
  // Locations are constructed from mockEpisodes' nested `locations` arrays.
  const locationsById = new Map<string, LocationData>()
  for (const ep of mockEpisodes) {
    for (const el of ep.locations) {
      if (!locationsById.has(el.locationId)) {
        locationsById.set(el.locationId, el.location)
      }
    }
  }

  for (const [mockId, loc] of locationsById) {
    const created = await prisma.location.create({
      data: {
        name: loc.name,
        address: loc.address,
        type: loc.type,
        description: loc.description,
        coordinates: loc.coordinates,
      },
    })
    locationIdMap[mockId] = created.id
  }
  console.log(`  • locations: ${locationsById.size}`)
}

async function seedEpisodes(): Promise<void> {
  for (const ep of mockEpisodes) {
    const created = await prisma.episode.create({
      data: {
        title: ep.title,
        description: ep.description,
        date: ep.date,
        episodeNumber: ep.episodeNumber,
        severity: ep.severity,
        status: ep.status,
      },
    })
    episodeIdMap[ep.id] = created.id
  }
  console.log(`  • episodes: ${mockEpisodes.length}`)
}

async function seedJunctions(): Promise<void> {
  let personEpisodeCount = 0
  let episodeArticleCount = 0
  let episodeLocationCount = 0

  for (const ep of mockEpisodes) {
    const episodeId = episodeIdMap[ep.id]

    // PersonEpisode — 7 rows total (p1/p2/p3/p4 → ep1, p1/p2 → ep2, p1 → ep3)
    for (const pe of ep.persons) {
      await prisma.personEpisode.create({
        data: {
          personId: personIdMap[pe.personId],
          episodeId,
          involvement: pe.involvement,
        },
      })
      personEpisodeCount++
    }

    // EpisodeArticle — ep1 → art1, ep2 → art2
    for (const ea of ep.articles) {
      await prisma.episodeArticle.create({
        data: {
          episodeId,
          articleId: articleIdMap[ea.articleId],
        },
      })
      episodeArticleCount++
    }

    // EpisodeLocation — ep1 → loc1, ep2 → loc2
    for (const el of ep.locations) {
      await prisma.episodeLocation.create({
        data: {
          episodeId,
          locationId: locationIdMap[el.locationId],
          context: el.context,
        },
      })
      episodeLocationCount++
    }
  }

  console.log(
    `  • junctions: PersonEpisode=${personEpisodeCount}, EpisodeArticle=${episodeArticleCount}, EpisodeLocation=${episodeLocationCount}`,
  )
}

async function seedGuiltAssessments(): Promise<void> {
  for (const ga of mockGuiltAssessments) {
    await prisma.guiltAssessment.create({
      data: {
        personId: personIdMap[ga.personId],
        episodeId: ga.episodeId ? episodeIdMap[ga.episodeId] : null,
        guiltLevel: ga.guiltLevel,
        evidenceStrength: ga.evidenceStrength,
        forecast: ga.forecast,
        confidence: ga.confidence,
        mitigating: ga.mitigating,
        aggravating: ga.aggravating,
        analysisDate: new Date(ga.analysisDate),
        notes: ga.notes,
      },
    })
  }
  console.log(`  • guiltAssessments: ${mockGuiltAssessments.length}`)
}

async function seedDefenseLines(): Promise<void> {
  for (const dl of mockDefenseLines) {
    await prisma.defenseLine.create({
      data: {
        personId: personIdMap[dl.personId],
        strategyType: dl.strategyType,
        title: dl.title,
        description: dl.description,
        evidence: dl.evidence,
        strength: dl.strength,
        probability: dl.probability,
        articleReferences: dl.articleReferences,
      },
    })
  }
  console.log(`  • defenseLines: ${mockDefenseLines.length}`)
}

async function seedLegalCompliance(): Promise<void> {
  for (const lc of mockComplianceChecks) {
    await prisma.legalCompliance.create({
      data: {
        documentId: docIdMap[lc.documentId],
        articleId: lc.articleId ? articleIdMap[lc.articleId] : null,
        checkType: lc.checkType,
        status: lc.status,
        description: lc.description,
        recommendation: lc.recommendation,
        legalBasis: lc.legalBasis,
        checkedAt: new Date(lc.checkedAt),
      },
    })
  }
  console.log(`  • legalCompliance: ${mockComplianceChecks.length}`)
}

async function seedProcessingQueue(): Promise<void> {
  for (const q of mockProcessingQueue) {
    await prisma.processingQueue.create({
      data: {
        documentId: docIdMap[q.documentId],
        queuePosition: q.queuePosition,
        status: q.status,
        startedAt: toDate(q.startedAt),
        completedAt: toDate(q.completedAt),
        error: q.error,
        priority: q.priority,
      },
    })
  }
  console.log(`  • processingQueue: ${mockProcessingQueue.length}`)
}

async function seedChatMessages(): Promise<void> {
  for (const cm of mockChatMessages) {
    await prisma.chatMessage.create({
      data: {
        question: cm.question,
        answer: cm.answer,
        contextType: cm.contextType,
        contextId: cm.contextId,
        createdAt: new Date(cm.createdAt),
      },
    })
  }
  console.log(`  • chatMessages: ${mockChatMessages.length}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('▶ Seeding criminal-case database…')

  console.log('• Wiping existing data…')
  await wipeAll()

  console.log('• Inserting base entities:')
  await seedDocuments()
  await seedPersons()
  await seedArticles()
  await seedLocations()
  await seedEpisodes()

  console.log('• Inserting junctions:')
  await seedJunctions()

  console.log('• Inserting auxiliary entities:')
  await seedGuiltAssessments()
  await seedDefenseLines()
  await seedLegalCompliance()
  await seedProcessingQueue()
  await seedChatMessages()

  console.log('✓ Seed complete.')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
