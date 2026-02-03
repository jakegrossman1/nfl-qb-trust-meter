import { NextRequest, NextResponse } from 'next/server';
import { getQuarterbackById, seedQuarterbacks } from '@/lib/db';
import { startingQBs } from '@/lib/qb-data';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure database is seeded
    await seedQuarterbacks(startingQBs);

    const { id } = await params;
    const qbId = parseInt(id, 10);

    if (isNaN(qbId)) {
      return NextResponse.json(
        { error: 'Invalid quarterback ID' },
        { status: 400 }
      );
    }

    const qb = await getQuarterbackById(qbId);

    if (!qb) {
      return NextResponse.json(
        { error: 'Quarterback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(qb);
  } catch (error) {
    console.error('Error fetching quarterback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quarterback' },
      { status: 500 }
    );
  }
}
