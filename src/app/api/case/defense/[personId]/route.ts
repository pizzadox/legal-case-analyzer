import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/case/defense/:personId
// Returns defense lines for a person.
// Accepts caseId query parameter to scope the fallback search.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    // Resolve actual person — accept either a real Prisma id or the legacy "p1" sentinel.
    let person = await db.person.findUnique({ where: { id: personId } });
    if (!person && caseId) {
      // Fallback to Kolesnichenko person in this specific case.
      person = await db.person.findFirst({ where: { caseId, isKolesnichenko: true } });
    }
    if (!person) {
      // Global fallback to the Kolesnichenko person.
      person = await db.person.findFirst({ where: { isKolesnichenko: true } });
    }
    if (!person && caseId) {
      // Fallback to any defendant in this case.
      person = await db.person.findFirst({
        where: { caseId, role: { in: ['обвиняемый', 'подозреваемый'] } },
      });
    }
    if (!person) {
      return NextResponse.json(
        { error: 'Участник не найден', personId },
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
    console.error('Ошибка загрузки линий защиты:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки линий защиты', details: String(error) },
      { status: 500 }
    );
  }
}
