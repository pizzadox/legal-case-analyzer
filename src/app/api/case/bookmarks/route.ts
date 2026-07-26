import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Bookmarks feature not yet implemented in database — return empty array
export async function GET(request: NextRequest) {
  try {
    // No Bookmark table in the database yet, return empty
    return NextResponse.json([]);
  } catch (error) {
    console.error('Bookmarks error:', error);
    return NextResponse.json([]);
  }
}
