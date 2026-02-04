import { NextResponse } from 'next/server';
import { getQuarterbackBySlug } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const qb = await getQuarterbackBySlug(params.slug);

    if (!qb) {
      return NextResponse.json({ error: 'Quarterback not found' }, { status: 404 });
    }

    return NextResponse.json(qb);
  } catch (error) {
    console.error('Error fetching QB by slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
