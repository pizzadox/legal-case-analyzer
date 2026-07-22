import { NextResponse } from 'next/server'
import { mockEvidenceChain } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(mockEvidenceChain)
  } catch (error) {
    console.error('Error fetching evidence chain:', error)
    return NextResponse.json(
      { error: 'Не удалось получить цепочку доказательств' },
      { status: 500 }
    )
  }
}
