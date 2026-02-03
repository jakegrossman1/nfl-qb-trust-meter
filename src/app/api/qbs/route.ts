import { NextResponse } from 'next/server';
import { getAllQuarterbacks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const qbs = await getAllQuarterbacks();
    return NextResponse.json(qbs);
  } catch (error) {
    console.error('Error fetching quarterbacks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quarterbacks' },
      { status: 500 }
    );
  }
}
