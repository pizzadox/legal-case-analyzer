import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Relationships derived from shared documents/episodes between persons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json([]);
    }

    // Build relationships from persons who share documents or episodes
    const persons = await db.person.findMany({
      where: { caseId },
      select: { id: true, fullName: true },
    });

    if (persons.length < 2) {
      return NextResponse.json([]);
    }

    // Find persons who appear in the same documents
    const sharedDocs = await db.personDocument.findMany({
      where: { person: { caseId } },
      select: { personId: true, documentId: true, role: true },
    });

    // Find persons who appear in the same episodes
    const sharedEps = await db.personEpisode.findMany({
      where: { person: { caseId } },
      select: { personId: true, episodeId: true, involvement: true },
    });

    const relationships: Array<{
      id: string;
      sourcePersonId: string;
      targetPersonId: string;
      relationshipType: string;
      description: string;
      sourcePersonName: string;
      targetPersonName: string;
    }> = [];

    // Group by document to find relationships
    const docGroups = new Map<string, Array<{ personId: string; role: string | null }>>();
    for (const sd of sharedDocs) {
      const group = docGroups.get(sd.documentId) ?? [];
      group.push({ personId: sd.personId, role: sd.role });
      docGroups.set(sd.documentId, group);
    }

    for (const [, group] of docGroups) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const p1 = persons.find(p => p.id === group[i].personId);
          const p2 = persons.find(p => p.id === group[j].personId);
          if (p1 && p2) {
            relationships.push({
              id: `rel-doc-${p1.id}-${p2.id}`,
              sourcePersonId: p1.id,
              targetPersonId: p2.id,
              relationshipType: 'упоминаются вместе',
              description: `Упомянуты в одном документе`,
              sourcePersonName: p1.fullName,
              targetPersonName: p2.fullName,
            });
          }
        }
      }
    }

    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Relationships error:', error);
    return NextResponse.json([]);
  }
}
