import { NextResponse } from 'next/server'
import { mockCaseBrief } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(mockCaseBrief)
  } catch (error) {
    console.error('Error fetching case brief:', error)
    return NextResponse.json(
      { error: 'Не удалось получить краткое изложение дела' },
      { status: 500 }
    )
  }
}
