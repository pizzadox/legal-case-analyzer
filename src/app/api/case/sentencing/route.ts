import { NextResponse } from 'next/server'
import { mockSentencing } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(mockSentencing)
  } catch (error) {
    console.error('Error fetching sentencing data:', error)
    return NextResponse.json(
      { error: 'Не удалось получить данные о наказании' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { articleCode } = body || {}

    if (articleCode) {
      const filtered = mockSentencing.filter(s =>
        s.articleCode.toLowerCase().includes(String(articleCode).toLowerCase())
      )
      return NextResponse.json(filtered.length > 0 ? filtered : mockSentencing)
    }

    return NextResponse.json(mockSentencing)
  } catch (error) {
    console.error('Error processing sentencing request:', error)
    return NextResponse.json(
      { error: 'Не удалось обработать запрос' },
      { status: 500 }
    )
  }
}
