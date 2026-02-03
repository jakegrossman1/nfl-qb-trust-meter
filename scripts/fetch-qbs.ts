/**
 * Script to fetch all NFL starting QBs from ESPN API and populate the database
 * Uses depth chart to get actual starters, not just first in roster
 * Run with: npx tsx scripts/fetch-qbs.ts
 */

import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// All 32 NFL teams with their ESPN team IDs
const NFL_TEAMS = [
  // AFC East
  { id: 2, abbrev: 'buf', name: 'Buffalo Bills' },
  { id: 15, abbrev: 'mia', name: 'Miami Dolphins' },
  { id: 17, abbrev: 'ne', name: 'New England Patriots' },
  { id: 20, abbrev: 'nyj', name: 'New York Jets' },
  // AFC North
  { id: 33, abbrev: 'bal', name: 'Baltimore Ravens' },
  { id: 4, abbrev: 'cin', name: 'Cincinnati Bengals' },
  { id: 5, abbrev: 'cle', name: 'Cleveland Browns' },
  { id: 23, abbrev: 'pit', name: 'Pittsburgh Steelers' },
  // AFC South
  { id: 34, abbrev: 'hou', name: 'Houston Texans' },
  { id: 11, abbrev: 'ind', name: 'Indianapolis Colts' },
  { id: 30, abbrev: 'jax', name: 'Jacksonville Jaguars' },
  { id: 10, abbrev: 'ten', name: 'Tennessee Titans' },
  // AFC West
  { id: 12, abbrev: 'kc', name: 'Kansas City Chiefs' },
  { id: 24, abbrev: 'lac', name: 'Los Angeles Chargers' },
  { id: 7, abbrev: 'den', name: 'Denver Broncos' },
  { id: 13, abbrev: 'lv', name: 'Las Vegas Raiders' },
  // NFC East
  { id: 21, abbrev: 'phi', name: 'Philadelphia Eagles' },
  { id: 6, abbrev: 'dal', name: 'Dallas Cowboys' },
  { id: 19, abbrev: 'nyg', name: 'New York Giants' },
  { id: 28, abbrev: 'wsh', name: 'Washington Commanders' },
  // NFC North
  { id: 9, abbrev: 'gb', name: 'Green Bay Packers' },
  { id: 8, abbrev: 'det', name: 'Detroit Lions' },
  { id: 3, abbrev: 'chi', name: 'Chicago Bears' },
  { id: 16, abbrev: 'min', name: 'Minnesota Vikings' },
  // NFC South
  { id: 27, abbrev: 'tb', name: 'Tampa Bay Buccaneers' },
  { id: 29, abbrev: 'car', name: 'Carolina Panthers' },
  { id: 18, abbrev: 'no', name: 'New Orleans Saints' },
  { id: 1, abbrev: 'atl', name: 'Atlanta Falcons' },
  // NFC West
  { id: 25, abbrev: 'sf', name: 'San Francisco 49ers' },
  { id: 14, abbrev: 'lar', name: 'Los Angeles Rams' },
  { id: 22, abbrev: 'ari', name: 'Arizona Cardinals' },
  { id: 26, abbrev: 'sea', name: 'Seattle Seahawks' },
];

interface QBData {
  name: string;
  team: string;
  espn_id: string;
  headshot_url: string;
}

async function fetchStartingQB(team: typeof NFL_TEAMS[0]): Promise<QBData | null> {
  // Try depth chart first (most reliable for starters)
  const depthChartUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/depthcharts`;

  try {
    const response = await fetch(depthChartUrl);
    if (response.ok) {
      const data = await response.json();

      // Find the QB position in depth chart
      for (const item of data.items || []) {
        if (item.name === 'offense' || !item.name) {
          for (const position of item.positions || []) {
            if (position.position?.abbreviation === 'QB') {
              // Get the first (starting) QB
              const starter = position.athletes?.[0]?.athlete;
              if (starter) {
                const headshot = starter.headshot?.href ||
                  `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${starter.id}.png&w=350&h=254`;

                return {
                  name: starter.displayName || starter.fullName,
                  team: team.name,
                  espn_id: String(starter.id),
                  headshot_url: headshot,
                };
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Depth chart failed, try roster
  }

  // Fallback to roster endpoint
  const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.abbrev}/roster`;

  try {
    const response = await fetch(rosterUrl);
    if (response.ok) {
      const data = await response.json();

      for (const group of data.athletes || []) {
        for (const athlete of group.items || []) {
          if (athlete.position?.abbreviation === 'QB') {
            const headshot = athlete.headshot?.href ||
              `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${athlete.id}.png&w=350&h=254`;

            return {
              name: athlete.fullName || athlete.displayName,
              team: team.name,
              espn_id: String(athlete.id),
              headshot_url: headshot,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error fetching roster for ${team.name}:`, e);
  }

  return null;
}

async function fetchAllStartingQBs(): Promise<QBData[]> {
  console.log('Fetching starting QBs from all 32 NFL teams...\n');

  const allQBs: QBData[] = [];

  for (const team of NFL_TEAMS) {
    const qb = await fetchStartingQB(team);

    if (qb) {
      allQBs.push(qb);
      console.log(`  ✓ ${team.name}: ${qb.name} (${qb.espn_id})`);
    } else {
      console.log(`  ❌ ${team.name}: No QB found`);
    }

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return allQBs;
}

async function clearAndSeedDatabase(qbs: QBData[]) {
  console.log('\nClearing existing data...');

  await client.execute('DELETE FROM trust_snapshots');
  await client.execute('DELETE FROM votes');
  await client.execute('DELETE FROM quarterbacks');

  console.log('Inserting new QB data...\n');

  for (const qb of qbs) {
    await client.execute({
      sql: `INSERT INTO quarterbacks (name, team, espn_id, headshot_url, trust_score, is_active)
            VALUES (?, ?, ?, ?, 50, 1)`,
      args: [qb.name, qb.team, qb.espn_id, qb.headshot_url],
    });
    console.log(`  ✓ Added: ${qb.name} (${qb.team})`);
  }

  // Create initial snapshots
  console.log('\nCreating initial trust snapshots...');
  const allQBs = await client.execute('SELECT id FROM quarterbacks');
  const today = new Date().toISOString().split('T')[0];

  for (const row of allQBs.rows) {
    await client.execute({
      sql: 'INSERT INTO trust_snapshots (qb_id, score, snapshot_date) VALUES (?, 50, ?)',
      args: [row.id, today],
    });
  }

  console.log('\n✅ Database seeded successfully!');
}

async function main() {
  console.log('='.repeat(50));
  console.log('NFL QB Trust Meter - Database Seeder');
  console.log('='.repeat(50) + '\n');

  // Fetch all starting QBs from ESPN
  const qbs = await fetchAllStartingQBs();

  console.log(`\nFound ${qbs.length} starting QBs total.\n`);

  if (qbs.length === 0) {
    console.error('No QBs found! Something went wrong with the API.');
    process.exit(1);
  }

  if (qbs.length < 32) {
    console.warn(`Warning: Only found ${qbs.length}/32 QBs. Some teams may be missing.`);
  }

  // Seed the database
  await clearAndSeedDatabase(qbs);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log('='.repeat(50));
  console.log(`Total QBs: ${qbs.length}`);
  console.log('\nYou can now:');
  console.log('1. View/edit QBs in Turso dashboard: https://turso.tech/app');
  console.log('2. Deploy to Vercel: vercel --prod');
  console.log('='.repeat(50));
}

main().catch(console.error);
