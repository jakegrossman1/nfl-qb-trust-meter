import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { startingQBs } from '@/lib/qb-data';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to sync QB data from qb-data.ts to the database.
 * GET /api/admin/sync-qbs?confirm=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm') === 'true';

    if (!confirm) {
      return NextResponse.json({
        message: 'Add ?confirm=true to execute the sync',
        preview: startingQBs,
        count: startingQBs.length,
      });
    }

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const results = {
      updated: [] as string[],
      added: [] as string[],
      deactivated: [] as string[],
      errors: [] as string[],
    };

    // Step 1: Give all existing QBs temporary unique ESPN IDs to avoid conflicts
    const currentQbs = await client.execute('SELECT id, name, team, espn_id FROM quarterbacks');
    for (const row of currentQbs.rows) {
      await client.execute({
        sql: 'UPDATE quarterbacks SET espn_id = ? WHERE id = ?',
        args: [`temp_${row.id}`, row.id],
      });
    }

    // Build map of current QBs
    const currentQbMap = new Map<string, { id: number; team: string; espn_id: string }>();
    for (const row of currentQbs.rows) {
      currentQbMap.set(row.name as string, {
        id: row.id as number,
        team: row.team as string,
        espn_id: row.espn_id as string,
      });
    }

    // Process each QB from qb-data.ts
    const processedNames = new Set<string>();

    for (const qb of startingQBs) {
      processedNames.add(qb.name);
      const existing = currentQbMap.get(qb.name);

      if (existing) {
        // Update QB
        try {
          await client.execute({
            sql: 'UPDATE quarterbacks SET team = ?, espn_id = ?, is_active = 1 WHERE id = ?',
            args: [qb.team, qb.espn_id, existing.id],
          });
          results.updated.push(`${qb.name}: team=${qb.team}, espn_id=${qb.espn_id}`);
        } catch (err) {
          results.errors.push(`Failed to update ${qb.name}: ${err}`);
        }
      } else {
        // Add new QB
        try {
          await client.execute({
            sql: 'INSERT INTO quarterbacks (name, team, espn_id, is_active) VALUES (?, ?, ?, 1)',
            args: [qb.name, qb.team, qb.espn_id],
          });
          results.added.push(qb.name);
        } catch (err) {
          results.errors.push(`Failed to add ${qb.name}: ${err}`);
        }
      }
    }

    // Deactivate QBs not in the list
    const qbEntries = Array.from(currentQbMap.entries());
    for (const [name, data] of qbEntries) {
      if (!processedNames.has(name)) {
        try {
          await client.execute({
            sql: 'UPDATE quarterbacks SET is_active = 0 WHERE id = ?',
            args: [data.id],
          });
          results.deactivated.push(name);
        } catch (err) {
          results.errors.push(`Failed to deactivate ${name}: ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        updated: results.updated.length,
        added: results.added.length,
        deactivated: results.deactivated.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    console.error('Error syncing QBs:', error);
    return NextResponse.json(
      { error: 'Failed to sync QBs', details: String(error) },
      { status: 500 }
    );
  }
}
