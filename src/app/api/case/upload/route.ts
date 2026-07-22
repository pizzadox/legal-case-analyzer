import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DOWNLOAD_DIR = '/home/z/my-project/download';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Get current max queue position
    const maxQueueEntry = await db.processingQueue.findFirst({
      orderBy: { queuePosition: 'desc' },
    });
    const startPosition = maxQueueEntry ? maxQueueEntry.queuePosition + 1 : 1;

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file) continue;

      // Validate file type
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        results.push({
          originalName: file.name,
          error: 'Only PDF files are accepted',
        });
        continue;
      }

      // Generate unique file name
      const fileId = uuidv4();
      const ext = path.extname(file.name) || '.pdf';
      const fileName = `${fileId}${ext}`;
      const filePath = path.join(DOWNLOAD_DIR, fileName);

      // Write file to disk
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Create Document record
      const document = await db.document.create({
        data: {
          fileName,
          originalName: file.name,
          filePath,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          processingStatus: 'pending',
        },
      });

      // Create ProcessingQueue entry
      const queueEntry = await db.processingQueue.create({
        data: {
          documentId: document.id,
          queuePosition: startPosition + i,
          status: 'queued',
          priority: 5,
        },
      });

      results.push({
        documentId: document.id,
        originalName: file.name,
        queuePosition: queueEntry.queuePosition,
        queueId: queueEntry.id,
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: results.filter((r) => !r.error),
      errors: results.filter((r) => r.error),
      totalProcessed: results.filter((r) => !r.error).length,
      totalErrors: results.filter((r) => r.error).length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files', details: String(error) },
      { status: 500 }
    );
  }
}
