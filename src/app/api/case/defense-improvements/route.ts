import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Defense improvements require LLM analysis — return empty until triggered
export async function POST(request: Request) {
  try {
    return NextResponse.json([]);
  } catch {
    return NextResponse.json([]);
  }
}
