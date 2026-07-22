import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/case/defense/:personId
// Returns defense lines for a person.
// If personId === 'p1' or invalid, falls back to the Kolesnichenko person.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;

    // Resolve actual person — accept either a real Prisma id or the legacy "p1" sentinel.
    let person = await db.person.findUnique({ where: { id: personId } });
    if (!person) {
      // Fallback to the Kolesnichenko person (the canonical defendant).
      person = await db.person.findFirst({ where: { isKolesnichenko: true } });
    }
    if (!person) {
      return NextResponse.json(
        { error: 'Person not found', personId },
        { status: 404 }
      );
    }

    const defenseLines = await db.defenseLine.findMany({
      where: { personId: person.id },
      orderBy: { id: 'asc' },
    });

    // Also include guilt assessments and episodes for richer client-side context.
    const guiltAssessments = await db.guiltAssessment.findMany({
      where: { personId: person.id },
      include: { episode: { select: { id: true, title: true } } },
    });

    return NextResponse.json({
      personId: person.id,
      personFullName: person.fullName,
      defenseStrategy: person.defenseStrategy,
      defenseLines,
      guiltAssessments,
    });
  } catch (error) {
    console.error('Failed to load defense lines:', error);
    return NextResponse.json(
      { error: 'Failed to load defense lines', details: String(error) },
      { status: 500 }
    );
  }
}
