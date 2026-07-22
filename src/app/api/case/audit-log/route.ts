import { NextResponse } from 'next/server'
import { mockAuditLog } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const category = searchParams.get('category')
    const severity = searchParams.get('severity')

    let result = [...mockAuditLog]

    if (category) {
      result = result.filter(entry => entry.category === category)
    }

    if (severity) {
      result = result.filter(entry => entry.severity === severity)
    }

    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(result.slice(0, limit))
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return NextResponse.json(
      { error: 'Не удалось получить журнал аудита' },
      { status: 500 }
    )
  }
}
