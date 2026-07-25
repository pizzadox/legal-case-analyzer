import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const caseId = formData.get('caseId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Нет файлов для загрузки' }, { status: 400 });
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

      // Create document record in database
      const doc = await db.document.create({
        data: {
          fileName,
          originalName: file.name,
          filePath: filePath,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
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
