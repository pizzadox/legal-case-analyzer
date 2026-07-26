import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Cross-reference graph derived from real DB cross references
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json([]);
    }

    // Get cross references for documents in this case
    const crossRefs = await db.crossReference.findMany({
      where: {
        sourceDocument: { caseId },
      },
      include: {
        sourceDocument: { select: { id: true, originalName: true, documentType: true } },
        targetDocument: { select: { id: true, originalName: true, documentType: true } },
      },
    });

    if (crossRefs.length === 0) {
      return NextResponse.json([]);
    }

    // Build graph nodes from documents with cross references
    const docMap = new Map<string, { documentId: string; documentName: string; documentType: string | null; linkedDocuments: Array<{ id: string; name: string; type: string | null; refType: string | null }> }>();

    for (const cr of crossRefs) {
      // Add source document node
      if (!docMap.has(cr.sourceDocumentId)) {
        docMap.set(cr.sourceDocumentId, {
          documentId: cr.sourceDocument.id,
          documentName: cr.sourceDocument.originalName,
          documentType: cr.sourceDocument.documentType,
          linkedDocuments: [],
        });
      }
      docMap.get(cr.sourceDocumentId)!.linkedDocuments.push({
        id: cr.targetDocument.id,
        name: cr.targetDocument.originalName,
        type: cr.targetDocument.documentType,
        refType: cr.referenceType,
      });

      // Add target document node
      if (!docMap.has(cr.targetDocumentId)) {
        docMap.set(cr.targetDocumentId, {
          documentId: cr.targetDocument.id,
          documentName: cr.targetDocument.originalName,
          documentType: cr.targetDocument.documentType,
          linkedDocuments: [],
        });
      }
    }

    return NextResponse.json(Array.from(docMap.values()));
  } catch (error) {
    console.error('Cross-ref-graph error:', error);
    return NextResponse.json([]);
  }
}
