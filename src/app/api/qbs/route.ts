import { NextResponse } from 'next/server';
import { getAllQuarterbacks, seedQuarterbacks } from '@/lib/db';
import { startingQBs } from '@/lib/qb-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ensure database is seeded
    await seedQuarterbacks(startingQBs);

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
