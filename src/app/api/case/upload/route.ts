import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

// Upload directory - same location the doc-processor microservice reads from
const UPLOAD_DIR = path.join(process.cwd(), 'upload')

// Supported MIME types for upload
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

// Max file size: 500 MB
const MAX_FILE_SIZE = 500 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    const formData = await request.formData()
    const caseId = formData.get('caseId') as string | null
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Нет файлов для загрузки' },
        { status: 400 }
      )
    }

    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId обязателен' },
        { status: 400 }
      )
    }

    // Verify the case exists
    const caseRecord = await db.criminalCase.findUnique({
      where: { id: caseId },
    })

    if (!caseRecord) {
      return NextResponse.json(
        { error: 'Дело не найдено' },
        { status: 404 }
      )
    }

    // Get the current max queue position for proper ordering
    const maxQueuePos = await db.processingQueue.aggregate({
      _max: { queuePosition: true },
    })
    const nextQueuePos = (maxQueuePos._max.queuePosition ?? 0) + 1

    const uploadedDocuments: Array<{
      id: string
      fileName: string
      originalName: string
      fileSize: number
      mimeType: string
      processingStatus: string
      uploadedAt: string
    }> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Файл "${file.name}" превышает лимит 500 МБ` },
          { status: 413 }
        )
      }

      // Validate MIME type
      if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('text/')) {
        return NextResponse.json(
          { error: `Формат файла "${file.name}" (${file.type}) не поддерживается` },
          { status: 415 }
        )
      }

      // Generate a unique filename to avoid collisions
      const ext = path.extname(file.name) || ''
      const safeName = file.name.replace(/[^\wа-яА-ЯёЁ.\-]/g, '_')
      const fileName = `${Date.now()}-${i}-${safeName}`
      const filePath = path.join(UPLOAD_DIR, fileName)

      // Save the file to disk
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      // Create Document record in DB
      const document = await db.document.create({
        data: {
          fileName,
          originalName: file.name,
          filePath,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          processingStatus: 'pending',
          caseId,
        },
      })

      // Create ProcessingQueue entry so the doc-processor can pick it up
      await db.processingQueue.create({
        data: {
          documentId: document.id,
          queuePosition: nextQueuePos + i,
          status: 'queued',
          priority: 5,
        },
      })

      uploadedDocuments.push({
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        processingStatus: document.processingStatus,
        uploadedAt: document.uploadedAt.toISOString(),
      })
    }

    console.log(`[Upload] Uploaded ${uploadedDocuments.length} documents for case ${caseId}`)

    return NextResponse.json({
      documents: uploadedDocuments,
      total: uploadedDocuments.length,
      message: `Загружено ${uploadedDocuments.length} документ(ов)`,
    })
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки файлов', details: String(error) },
      { status: 500 }
    )
  }
}
