import { NextResponse } from 'next/server';
import { mockPersonRelationships } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json(mockPersonRelationships);
}
