import { NextResponse } from 'next/server';
import { mockEvidenceTimeline } from '@/lib/mock-data';

export async function GET() {
  // In production, this would query from database
  // For now, return mock data
  return NextResponse.json(mockEvidenceTimeline);
}
