import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// Increase body size limit for large file uploads (up to 500MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

// Supported MIME types mapping
const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/webp': 'webp',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'text/csv': 'csv',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const caseId = formData.get('caseId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Нет файлов для загрузки' }, { status: 400 });
    }

    // Validate file types
    for (const file of files) {
      const mime = file.type || 'application/octet-stream';
      if (!SUPPORTED_MIME_TYPES[mime] && !mime.startsWith('image/') && !mime.startsWith('text/')) {
        // Allow unknown image/text types as well, but reject clearly unsupported ones
        const ext = file.name.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'xls', 'xlsx', 'odt', 'ods', 'csv'];
        if (!ext || !allowedExtensions.includes(ext)) {
          return NextResponse.json(
            { error: `Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаемые: ${allowedExtensions.join(', ')}` },
            { status: 400 }
          );
        }
      }
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const uploadedDocuments = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, buffer);

      // Determine document type from MIME type or file extension
      const mimeType = file.type || 'application/pdf';

      // Create document record in database
      const doc = await db.document.create({
        data: {
          fileName,
          originalName: file.name,
          filePath: filePath,
          fileSize: file.size,
          mimeType,
          processingStatus: 'pending',
          caseId: caseId || null,
        },
      });

      // Create processing queue entry
      await db.processingQueue.create({
        data: {
          documentId: doc.id,
          queuePosition: uploadedDocuments.length,
          status: 'queued',
          priority: 5,
        },
      });

      uploadedDocuments.push({
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        extractedText: doc.extractedText,
        summary: doc.summary,
        documentDate: doc.documentDate,
        documentType: doc.documentType,
        sourceReference: doc.sourceReference,
        processingStatus: doc.processingStatus,
        processingError: doc.processingError,
        uploadedAt: doc.uploadedAt,
        processedAt: doc.processedAt,
      });
    }

    return NextResponse.json(uploadedDocuments);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки файлов', details: String(error) },
      { status: 500 }
    );
  }
}
