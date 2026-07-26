import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json([]);
    }

    // Build evidence timeline from real document events
    const documents = await db.document.findMany({
      where: { caseId },
      select: {
        id: true,
        originalName: true,
        documentType: true,
        uploadedAt: true,
        processedAt: true,
        processingStatus: true,
      },
      orderBy: { uploadedAt: 'asc' },
    });

    const events: Array<{
      id: string;
      date: string;
      eventType: string;
      description: string;
      relatedEntityId: string;
      relatedEntityName: string;
    }> = [];

    for (const doc of documents) {
      // Document upload event
      events.push({
        id: `ev-upload-${doc.id}`,
        date: doc.uploadedAt.toISOString(),
        eventType: 'document_upload',
        description: `Загрузка документа: ${doc.originalName}`,
        relatedEntityId: doc.id,
        relatedEntityName: doc.originalName,
      });

      // Document processing complete event
      if (doc.processingStatus === 'completed' && doc.processedAt) {
        events.push({
          id: `ev-complete-${doc.id}`,
          date: doc.processedAt.toISOString(),
          eventType: 'analysis_complete',
          description: `ИИ-анализ завершён: ${doc.originalName}`,
          relatedEntityId: doc.id,
          relatedEntityName: doc.originalName,
        });
      }
    }

    // Add compliance check events
    const complianceChecks = await db.legalCompliance.findMany({
      where: { document: { caseId } },
      select: {
        id: true,
        checkType: true,
        status: true,
        description: true,
        checkedAt: true,
        document: { select: { id: true, originalName: true } },
      },
    });

    for (const cc of complianceChecks) {
      events.push({
        id: `ev-compliance-${cc.id}`,
        date: cc.checkedAt.toISOString(),
        eventType: 'compliance_check',
        description: `Проверка: ${cc.description} — ${cc.status}`,
        relatedEntityId: cc.document.id,
        relatedEntityName: cc.document.originalName,
      });
    }

    // Sort by date ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(events);
  } catch (error) {
    console.error('Evidence timeline error:', error);
    return NextResponse.json([]);
  }
}
