import { NextResponse } from 'next/server';
import { mockCaseHealthScore } from '@/lib/mock-data';

export async function GET() {
  // In production, this would calculate from real database data
  // For now, return mock data
  return NextResponse.json(mockCaseHealthScore);
}
