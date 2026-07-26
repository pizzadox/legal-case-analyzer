import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const category = searchParams.get('category');
    const importance = searchParams.get('importance');

    if (!caseId) {
      return NextResponse.json([]);
    }

    // Build case timeline from real data: episodes, documents, compliance checks
    const events: Array<{
      id: string;
      date: string;
      endDate?: string;
      title: string;
      description: string;
      category: string;
      importance: string;
      relatedPersons?: string[];
      relatedDocuments?: string[];
      relatedEpisodes?: string[];
      status: string;
    }> = [];

    // Add criminal case creation event
    const criminalCase = await db.criminalCase.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true, caseTitle: true, createdAt: true, status: true },
    });

    if (criminalCase) {
      events.push({
        id: `tl-case-${criminalCase.id}`,
        date: criminalCase.createdAt.toISOString(),
        title: `Возбуждение дела № ${criminalCase.caseNumber}`,
        description: criminalCase.caseTitle,
        category: 'legal',
        importance: 'critical',
        status: criminalCase.status === 'closed' ? 'completed' : 'ongoing',
      });
    }

    // Add episode events
    const episodes = await db.episode.findMany({
      where: { caseId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        severity: true,
        status: true,
        persons: { select: { personId: true } },
      },
    });

    for (const ep of episodes) {
      const importance = ep.severity?.includes('особо') || ep.severity?.includes('тяжкое')
        ? 'critical'
        : ep.severity?.includes('средней') ? 'high' : 'medium';
      const status = ep.status?.includes('доказано') ? 'completed'
        : ep.status?.includes('расследуется') ? 'ongoing' : 'planned';

      events.push({
        id: `tl-ep-${ep.id}`,
        date: ep.date ?? ep.description.substring(0, 10),
        title: ep.title,
        description: ep.description,
        category: 'crime',
        importance,
        relatedPersons: ep.persons.map(p => p.personId),
        relatedEpisodes: [ep.id],
        status,
      });
    }

    // Add document upload events
    const documents = await db.document.findMany({
      where: { caseId },
      select: {
        id: true,
        originalName: true,
        documentType: true,
        uploadedAt: true,
        processingStatus: true,
      },
    });

    for (const doc of documents) {
      events.push({
        id: `tl-doc-${doc.id}`,
        date: doc.uploadedAt.toISOString(),
        title: `Документ: ${doc.originalName}`,
        description: doc.documentType ?? 'Неизвестный тип документа',
        category: 'evidence',
        importance: 'medium',
        relatedDocuments: [doc.id],
        status: doc.processingStatus === 'completed' ? 'completed'
          : doc.processingStatus === 'processing' ? 'ongoing' : 'planned',
      });
    }

    // Filter by category and importance
    let result = [...events];
    if (category) {
      result = result.filter(event => event.category === category);
    }
    if (importance) {
      result = result.filter(event => event.importance === importance);
    }

    // Sort by date ascending
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(result);
  } catch (error) {
    console.error('Case timeline error:', error);
    return NextResponse.json([]);
  }
}
