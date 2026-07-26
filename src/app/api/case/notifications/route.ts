import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Notifications feature not yet implemented in database — return empty array
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json([]);
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json([]);
  }
}
