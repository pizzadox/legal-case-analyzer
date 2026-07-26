import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');

    // Build audit log from real document events
    const entries: Array<{
      id: string;
      timestamp: string;
      action: string;
      category: string;
      actor: string;
      details: string;
      entityId?: string;
      entityType?: string;
      severity: string;
    }> = [];

    if (caseId) {
      // Document upload events
      const documents = await db.document.findMany({
        where: { caseId },
        select: {
          id: true,
          originalName: true,
          uploadedAt: true,
          processingStatus: true,
          processedAt: true,
          processingError: true,
        },
        orderBy: { uploadedAt: 'desc' },
        take: 20,
      });

      for (const doc of documents) {
        entries.push({
          id: `al-upload-${doc.id}`,
          timestamp: doc.uploadedAt.toISOString(),
          action: 'Загрузка документа',
          category: 'upload',
          actor: 'Адвокат',
          details: doc.originalName,
          entityId: doc.id,
          entityType: 'document',
          severity: 'info',
        });

        if (doc.processingStatus === 'completed') {
          entries.push({
            id: `al-process-${doc.id}`,
            timestamp: (doc.processedAt ?? doc.uploadedAt).toISOString(),
            action: 'ИИ-обработка завершена',
            category: 'analysis',
            actor: 'ИИ-аналитик',
            details: doc.originalName,
            entityId: doc.id,
            entityType: 'document',
            severity: 'info',
          });
        } else if (doc.processingStatus === 'failed') {
          entries.push({
            id: `al-fail-${doc.id}`,
            timestamp: doc.uploadedAt.toISOString(),
            action: 'Ошибка обработки',
            category: 'analysis',
            actor: 'Система',
            details: `${doc.originalName}: ${doc.processingError ?? 'Неизвестная ошибка'}`,
            entityId: doc.id,
            entityType: 'document',
            severity: 'critical',
          });
        } else if (doc.processingStatus === 'processing') {
          entries.push({
            id: `al-proc-${doc.id}`,
            timestamp: doc.uploadedAt.toISOString(),
            action: 'ИИ-обработка в процессе',
            category: 'analysis',
            actor: 'ИИ-аналитик',
            details: doc.originalName,
            entityId: doc.id,
            entityType: 'document',
            severity: 'warning',
          });
        }
      }

      // Compliance check events
      const complianceChecks = await db.legalCompliance.findMany({
        where: { document: { caseId } },
        select: {
          id: true,
          checkType: true,
          status: true,
          description: true,
          checkedAt: true,
          document: { select: { originalName: true } },
        },
        take: 10,
      });

      for (const cc of complianceChecks) {
        entries.push({
          id: `al-cc-${cc.id}`,
          timestamp: cc.checkedAt.toISOString(),
          action: `Проверка: ${cc.checkType}`,
          category: 'analysis',
          actor: 'ИИ-аналитик',
          details: `${cc.document.originalName}: ${cc.description}`,
          entityId: cc.id,
          entityType: 'compliance',
          severity: cc.status === 'violation' ? 'critical'
            : cc.status === 'warning' ? 'warning' : 'info',
        });
      }
    }

    // Filter by category and severity
    let result = [...entries];
    if (category) {
      result = result.filter(entry => entry.category === category);
    }
    if (severity) {
      result = result.filter(entry => entry.severity === severity);
    }

    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(result.slice(0, limit));
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json([]);
  }
}
