import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/case/cases/[caseId] - get a single criminal case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    const criminalCase = await db.criminalCase.findUnique({
      where: { id: caseId },
      include: {
        _count: {
          select: { documents: true, persons: true, episodes: true },
        },
      },
    });

    if (!criminalCase) {
      return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
    }

    return NextResponse.json({
      id: criminalCase.id,
      caseNumber: criminalCase.caseNumber,
      caseTitle: criminalCase.caseTitle,
      defendantName: criminalCase.defendantName,
      articles: criminalCase.articles,
      status: criminalCase.status,
      createdAt: criminalCase.createdAt,
      updatedAt: criminalCase.updatedAt,
      documentCount: criminalCase._count.documents,
      personCount: criminalCase._count.persons,
      episodeCount: criminalCase._count.episodes,
    });
  } catch (error) {
    console.error('Get case error:', error);
    return NextResponse.json({ error: 'Ошибка получения дела' }, { status: 500 });
  }
}

// PATCH /api/case/cases/[caseId] - update a criminal case
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await request.json();

    const updated = await db.criminalCase.update({
      where: { id: caseId },
      data: {
        caseNumber: body.caseNumber,
        caseTitle: body.caseTitle,
        defendantName: body.defendantName,
        articles: body.articles,
        status: body.status,
      },
    });

    return NextResponse.json({
      id: updated.id,
      caseNumber: updated.caseNumber,
      caseTitle: updated.caseTitle,
      defendantName: updated.defendantName,
      articles: updated.articles,
      status: updated.status,
    });
  } catch (error) {
    console.error('Update case error:', error);
    return NextResponse.json({ error: 'Ошибка обновления дела' }, { status: 500 });
  }
}

// DELETE /api/case/cases/[caseId] - delete a criminal case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    // Delete all related data first
    await db.criminalCase.delete({ where: { id: caseId } });

    return NextResponse.json({ success: true, message: 'Дело удалено' });
  } catch (error) {
    console.error('Delete case error:', error);
    return NextResponse.json({ error: 'Ошибка удаления дела' }, { status: 500 });
  }
}
