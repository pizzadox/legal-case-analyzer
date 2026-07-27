// Database seed script for the Criminal Case Management System.
// Run with: `bun prisma/seed.ts`
//
// This script wipes all existing rows (in FK-safe order) and then:
// 1. Creates the criminal case (Уголовное дело Колесниченко Д.А.)
// 2. Registers the 3 real PDF documents from the upload directory
// 3. Creates processing queue entries so the doc-processor picks them up
//
// The doc-processor microservice will then OCR and analyze these documents
// using VLM and LLM, creating persons, episodes, articles, etc.

import { PrismaClient } from '@prisma/client'
import { existsSync, statSync, copyFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

const UPLOAD_DIR = join(process.cwd(), 'upload')

// The 3 PDF files that were uploaded by the user
const PDF_FILES = [
  { originalName: 'том 1_0001-страницы-1.pdf', fileSize: 45202813 },
  { originalName: 'том 1_0001-страницы-2.pdf', fileSize: 50229476 },
  { originalName: 'том 1_0001-страницы-3.pdf', fileSize: 42011610 },
]

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------

async function wipeAll(): Promise<void> {
  console.log('• Wiping existing data…')

  // Delete children first to respect foreign-key constraints
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
  await prisma.criminalCase.deleteMany()

  console.log('  ✓ All tables cleared')
}

// ---------------------------------------------------------------------------
// Seed Criminal Case
// ---------------------------------------------------------------------------

async function seedCriminalCase(): Promise<string> {
  console.log('• Creating criminal case…')

  const caseRecord = await prisma.criminalCase.create({
    data: {
      caseNumber: '№ 2024-00145',
      caseTitle: 'Уголовное дело по обвинению Колесниченко Д.А.',
      defendantName: 'Колесниченко Д.А.',
      articles: 'ст. 159 ч.3, ст. 160 ч.2 УК РФ',
      status: 'active',
    },
  })

  console.log(`  ✓ Case created: ${caseRecord.id} — ${caseRecord.caseTitle}`)
  return caseRecord.id
}

// ---------------------------------------------------------------------------
// Seed Documents (real PDF files)
// ---------------------------------------------------------------------------

async function seedDocuments(caseId: string): Promise<string[]> {
  console.log('• Registering PDF documents…')

  const documentIds: string[] = []

  // Get max queue position
  const maxPos = await prisma.processingQueue.aggregate({ _max: { queuePosition: true } })
  let nextQueuePosition = (maxPos._max.queuePosition ?? 0) + 1

  for (const pdf of PDF_FILES) {
    const originalPath = join(UPLOAD_DIR, pdf.originalName)

    // Check that the original file exists
    if (!existsSync(originalPath)) {
      console.error(`  ✗ File not found: ${originalPath}`)
      continue
    }

    // Verify actual file size
    const actualSize = statSync(originalPath).size

    // Generate unique filename for storage (avoids collisions)
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).slice(2, 8)
    const uniqueName = `${timestamp}-${randomSuffix}-${pdf.originalName}`
    const uniquePath = join(UPLOAD_DIR, uniqueName)

    // Copy original to unique-named file (so the original can be re-uploaded)
    // Use the full path for destination, not just the filename
    copyFileSync(originalPath, uniquePath)

    // Create Document record in DB
    const document = await prisma.document.create({
      data: {
        fileName: uniqueName,
        originalName: pdf.originalName,
        filePath: uniquePath,
        fileSize: actualSize,
        mimeType: 'application/pdf',
        documentType: 'pdf',
        processingStatus: 'pending',
        caseId: caseId,
      },
    })

    // Create ProcessingQueue entry
    await prisma.processingQueue.create({
      data: {
        documentId: document.id,
        queuePosition: nextQueuePosition,
        status: 'queued',
        priority: 5,
        progressPercent: 0,
      },
    })
    nextQueuePosition++

    documentIds.push(document.id)
    console.log(`  ✓ Registered: ${pdf.originalName} → doc ${document.id} (queue pos ${nextQueuePosition - 1})`)
  }

  console.log(`  ✓ ${documentIds.length} documents registered`)
  return documentIds
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('▶ Seeding criminal-case database with real documents…')

  await wipeAll()

  const caseId = await seedCriminalCase()

  const documentIds = await seedDocuments(caseId)

  console.log('\n✓ Seed complete!')
  console.log(`  • Case ID: ${caseId}`)
  console.log(`  • Documents: ${documentIds.length}`)
  console.log('  • The doc-processor microservice will now OCR and analyze these PDFs.')
  console.log('  • After processing completes, persons, episodes, and articles will be created by the AI.')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
