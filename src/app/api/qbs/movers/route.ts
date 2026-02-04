import { NextResponse } from 'next/server';
import { getQuarterbacksWithMovement } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const qbs = await getQuarterbacksWithMovement();

    // Sort by movement and get top risers and fallers
    const sorted = [...qbs].sort((a, b) => b.movement - a.movement);

    const risers = sorted.slice(0, 3).filter(qb => qb.movement > 0);
    const fallers = sorted.slice(-3).reverse().filter(qb => qb.movement < 0);

    return NextResponse.json({ risers, fallers });
  } catch (error) {
    console.error('Error fetching movers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movers' },
      { status: 500 }
    );
  }
}
