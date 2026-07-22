import { NextResponse } from 'next/server'
import { mockBookmarks } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(mockBookmarks)
  } catch (error) {
    console.error('Error fetching bookmarks:', error)
    return NextResponse.json(
      { error: 'Не удалось получить закладки' },
      { status: 500 }
    )
  }
}
