import { NextResponse } from 'next/server';
import { mockDefenseImprovements } from '@/lib/mock-data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // In production, this would use LLM to generate improvements based on defense lines
    // For now, return mock data
    return NextResponse.json(mockDefenseImprovements);
  } catch {
    return NextResponse.json(mockDefenseImprovements);
  }
}
