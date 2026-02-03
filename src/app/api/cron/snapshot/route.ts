import { NextRequest, NextResponse } from 'next/server';
import { createTrustSnapshots } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint to create trust score snapshots for all QBs.
 * This should be called via Vercel Cron (hourly or daily).
 *
 * To set up Vercel Cron, add this to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/snapshot",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, validate the request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const snapshots = await createTrustSnapshots();

    return NextResponse.json({
      success: true,
      message: `Created ${snapshots.length} snapshots`,
      timestamp: new Date().toISOString(),
      snapshots,
    });
  } catch (error) {
    console.error('Error creating snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshots' },
      { status: 500 }
    );
  }
}
