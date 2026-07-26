import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Witness statements — derived from persons with role "свидетель" and their episodes/documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    // If no caseId provided, return empty array
    if (!caseId) {
      return NextResponse.json([]);
    }

    // Witness statements feature is not fully implemented yet.
    // Future: derive from person episodes/documents where person.role = "свидетель"
    return NextResponse.json([]);
  } catch (error) {
    console.error('Witness statements error:', error);
    return NextResponse.json([]);
  }
}
