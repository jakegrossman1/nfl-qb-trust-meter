import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to view and cleanup duplicate QBs in the database.
 * GET /api/admin/cleanup - shows all QBs in database
 * GET /api/admin/cleanup?fix=true - removes duplicates, keeps lowest ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fix = searchParams.get('fix') === 'true';

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Get all QBs
    const allQbs = await client.execute('SELECT id, name, team, espn_id, is_active FROM quarterbacks ORDER BY name, id');

    if (!fix) {
      return NextResponse.json({
        message: 'Add ?fix=true to remove duplicates',
        total: allQbs.rows.length,
        quarterbacks: allQbs.rows,
      });
    }

    // Find and remove duplicates (keep the one with lowest ID)
    const seen = new Map<string, number>();
    const toDelete: number[] = [];

    for (const row of allQbs.rows) {
      const name = row.name as string;
      const id = row.id as number;

      if (seen.has(name)) {
        // This is a duplicate - mark for deletion
        toDelete.push(id);
      } else {
        seen.set(name, id);
      }
    }

    // Delete duplicates
    for (const id of toDelete) {
      // First delete related votes and snapshots
      await client.execute({ sql: 'DELETE FROM votes WHERE qb_id = ?', args: [id] });
      await client.execute({ sql: 'DELETE FROM trust_snapshots WHERE qb_id = ?', args: [id] });
      await client.execute({ sql: 'DELETE FROM quarterbacks WHERE id = ?', args: [id] });
    }

    return NextResponse.json({
      success: true,
      deleted: toDelete.length,
      deletedIds: toDelete,
      remaining: allQbs.rows.length - toDelete.length,
    });
  } catch (error) {
    console.error('Error in cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup', details: String(error) },
      { status: 500 }
    );
  }
}
