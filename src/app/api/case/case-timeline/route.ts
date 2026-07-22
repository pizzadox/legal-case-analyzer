import { NextResponse } from 'next/server'
import { mockCaseTimeline } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const importance = searchParams.get('importance')

    let result = [...mockCaseTimeline]

    if (category) {
      result = result.filter(event => event.category === category)
    }

    if (importance) {
      result = result.filter(event => event.importance === importance)
    }

    // Sort by date ascending
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching case timeline:', error)
    return NextResponse.json(
      { error: 'Не удалось получить хронологию дела' },
      { status: 500 }
    )
  }
}
