import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Witness statements feature not yet implemented in database — return empty array
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json([]);
  } catch (error) {
    console.error('Witness statements error:', error);
    return NextResponse.json([]);
  }
}
