import { NextResponse } from 'next/server'
import { mockWitnessStatements } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(mockWitnessStatements)
  } catch (error) {
    console.error('Error fetching witness statements:', error)
    return NextResponse.json(
      { error: 'Не удалось получить показания свидетелей' },
      { status: 500 }
    )
  }
}
