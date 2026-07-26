import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// 5-minute timeout for large file uploads
export const maxDuration = 300;

// Increase body size limit for large file uploads (500MB)
export const dynamic = 'force-dynamic';

// Supported MIME types for upload
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text', // .odt
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export async function POST(request: NextRequest) {
  try {
    // Parse formData — this can fail for very large files or malformed requests
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('[Upload] FormData parsing failed:', formError instanceof Error ? formError.message : String(formError));
      return NextResponse.json(
        { error: 'Не удалось прочитать данные загрузки. Файл слишком большой или запрос повреждён.', details: formError instanceof Error ? formError.message : String(formError) },
        { status: 400 }
      );
    }

    const files = formData.getAll('files') as File[];
    const caseId = formData.get('caseId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Нет файлов для загрузки' }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Файл "${file.name}" превышает лимит 500 МБ` },
          { status: 400 }
        );
      }
      if (!SUPPORTED_MIME_TYPES.includes(file.type) && file.type !== '') {
        // Allow files with empty MIME type (some browsers send empty for unknown types)
        console.log(`[Upload] Unknown MIME type for ${file.name}: ${file.type}, allowing anyway`);
      }
    }

    // Verify caseId exists if provided
    if (caseId) {
      const caseExists = await db.criminalCase.findUnique({ where: { id: caseId } });
      if (!caseExists) {
        return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
      }
    }

    const uploadDir = path.join(process.cwd(), 'upload');

    // Ensure upload directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (mkdirErr) {
      console.error('[Upload] Failed to create upload directory:', mkdirErr);
      // Continue anyway — writeFile will fail if directory truly doesn't exist
    }

    const createdDocuments: any[] = [];

    // Get current max queue position to assign new positions
    const maxQueuePosition = await db.processingQueue.aggregate({
      _max: { queuePosition: true },
    });
    let nextQueuePosition = (maxQueuePosition._max.queuePosition ?? 0) + 1;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Generate unique file name to avoid collisions
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
      const filePath = path.join(uploadDir, uniqueName);

      // Save file to disk
      try {
        await writeFile(filePath, buffer);
      } catch (writeErr) {
        console.error(`[Upload] Failed to write file ${uniqueName}:`, writeErr);
        return NextResponse.json(
          { error: `Ошибка сохранения файла "${file.name}"` },
          { status: 500 }
        );
      }

      // Determine document type from MIME type
      let documentType: string | null = null;
      if (file.type === 'application/pdf') documentType = 'pdf';
      else if (file.type.includes('word') || file.type.includes('document')) documentType = 'document';
      else if (file.type.includes('excel') || file.type.includes('sheet')) documentType = 'table';
      else if (file.type.startsWith('image/')) documentType = 'image';
      else if (file.type === 'text/plain') documentType = 'text';
      else if (file.type === 'text/csv') documentType = 'csv';

      // Create Document record in DB
      const document = await db.document.create({
        data: {
          fileName: uniqueName,
          originalName: file.name,
          filePath: filePath,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          documentType: documentType,
          processingStatus: 'pending',
          caseId: caseId || null,
        },
      });

      // Create ProcessingQueue entry for this document
      await db.processingQueue.create({
        data: {
          documentId: document.id,
          queuePosition: nextQueuePosition,
          status: 'queued',
          priority: 5,
        },
      });
      nextQueuePosition++;

      createdDocuments.push({
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        extractedText: document.extractedText,
        summary: document.summary,
        documentDate: document.documentDate,
        documentType: document.documentType,
        sourceReference: document.sourceReference,
        processingStatus: document.processingStatus,
        processingError: document.processingError,
        uploadedAt: document.uploadedAt.toISOString(),
        processedAt: document.processedAt?.toISOString() || null,
      });

      console.log(`[Upload] Created document ${document.id} (${file.name}) for case ${caseId || 'none'}`);
    }

    return NextResponse.json(createdDocuments);
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки файлов', details: String(error) },
      { status: 500 }
    );
  }
}
