import { NextResponse } from 'next/server'
import { mockRiskAssessment } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(mockRiskAssessment)
  } catch (error) {
    console.error('Error fetching risk assessment:', error)
    return NextResponse.json(
      { error: 'Не удалось получить оценку рисков' },
      { status: 500 }
    )
  }
}
