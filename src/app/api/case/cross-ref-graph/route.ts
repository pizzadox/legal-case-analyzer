import { NextResponse } from 'next/server';
import { mockCrossRefNodes } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json(mockCrossRefNodes);
}
