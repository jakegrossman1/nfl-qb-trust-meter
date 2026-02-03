import { NextRequest, NextResponse } from 'next/server';
import { recordVote } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const qbId = parseInt(id, 10);

    if (isNaN(qbId)) {
      return NextResponse.json(
        { error: 'Invalid quarterback ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { direction } = body;

    if (!direction || !['more', 'less'].includes(direction)) {
      return NextResponse.json(
        { error: 'Invalid direction. Must be "more" or "less"' },
        { status: 400 }
      );
    }

    const updatedQb = await recordVote(qbId, direction);

    if (!updatedQb) {
      return NextResponse.json(
        { error: 'Quarterback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedQb);
  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
