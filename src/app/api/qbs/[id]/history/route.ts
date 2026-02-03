import { NextRequest, NextResponse } from 'next/server';
import { getTrustHistory, getQuarterbackById, seedQuarterbacks } from '@/lib/db';
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

    // Get days parameter from query string
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const history = await getTrustHistory(qbId, days);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching trust history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trust history' },
      { status: 500 }
    );
  }
}
