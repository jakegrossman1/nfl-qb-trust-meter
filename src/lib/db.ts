import { createClient, Client } from '@libsql/client';
import { PRIOR_STRENGTH, HALF_LIFE_DAYS, DEFAULT_SCORE } from './config';

// Lazy-load client to avoid build-time errors
let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// Initialize database tables
async function initDb() {
  const db = getClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS quarterbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      team TEXT NOT NULL,
      espn_id TEXT NOT NULL UNIQUE,
      headshot_url TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add headshot_url column if it doesn't exist (migration for existing DBs)
  try {
    await db.execute(`ALTER TABLE quarterbacks ADD COLUMN headshot_url TEXT`);
  } catch {
    // Column already exists, ignore
  }

  // Add is_active column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE quarterbacks ADD COLUMN is_active BOOLEAN DEFAULT 1`);
  } catch {
    // Column already exists, ignore
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qb_id INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('more', 'less')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qb_id) REFERENCES quarterbacks(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS trust_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qb_id INTEGER NOT NULL,
      score REAL NOT NULL,
      snapshot_date DATE NOT NULL,
      FOREIGN KEY (qb_id) REFERENCES quarterbacks(id),
      UNIQUE(qb_id, snapshot_date)
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_qb_id ON votes(qb_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_snapshots_qb_id ON trust_snapshots(qb_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_snapshots_date ON trust_snapshots(snapshot_date)`);
}

// Track initialization
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

// Base quarterback data from DB (without computed score)
export interface QuarterbackBase {
  id: number;
  name: string;
  team: string;
  espn_id: string;
  headshot_url: string | null;
  is_active: boolean;
  created_at: string;
}

// Quarterback with computed trust score
export interface Quarterback extends QuarterbackBase {
  trust_score: number;
}

// Quarterback with additional vote stats
export interface QuarterbackWithStats extends Quarterback {
  recent_vote_count: number;
}

export interface Vote {
  id: number;
  qb_id: number;
  direction: 'more' | 'less';
  created_at: string;
}

export interface TrustSnapshot {
  id: number;
  qb_id: number;
  score: number;
  snapshot_date: string;
}

/**
 * Calculate trust score using time-weighted voting with Bayesian prior
 *
 * Formula:
 * trust_score = (sum of weighted votes + PRIOR_STRENGTH * 50) / (sum of weights + PRIOR_STRENGTH)
 *
 * Where:
 * - vote_value = 100 for "trust more", 0 for "trust less"
 * - decay_weight = 0.5 ^ (vote_age_in_days / HALF_LIFE_DAYS)
 */
function calculateTrustScore(votes: { direction: string; created_at: string }[]): number {
  if (votes.length === 0) {
    return DEFAULT_SCORE;
  }

  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const vote of votes) {
    const voteTime = new Date(vote.created_at).getTime();
    const ageInDays = (now - voteTime) / (1000 * 60 * 60 * 24);
    const decayWeight = Math.pow(0.5, ageInDays / HALF_LIFE_DAYS);
    const voteValue = vote.direction === 'more' ? 100 : 0;

    weightedSum += voteValue * decayWeight;
    totalWeight += decayWeight;
  }

  // Apply Bayesian prior (PRIOR_STRENGTH virtual votes at 50)
  const priorSum = PRIOR_STRENGTH * DEFAULT_SCORE;
  const score = (weightedSum + priorSum) / (totalWeight + PRIOR_STRENGTH);

  return Math.round(score * 10) / 10; // Round to 1 decimal place
}

/**
 * Count votes within the last N days
 */
function countRecentVotes(votes: { created_at: string }[], days: number = HALF_LIFE_DAYS): number {
  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);

  return votes.filter(vote => new Date(vote.created_at).getTime() > cutoff).length;
}

// Get all quarterbacks with computed trust scores
export async function getAllQuarterbacks(): Promise<Quarterback[]> {
  await ensureInitialized();
  const db = getClient();

  // Get all active quarterbacks
  const qbResult = await db.execute('SELECT * FROM quarterbacks WHERE is_active = 1');
  const qbs = qbResult.rows as unknown as QuarterbackBase[];

  // Get all votes
  const votesResult = await db.execute('SELECT qb_id, direction, created_at FROM votes');
  const allVotes = votesResult.rows as unknown as { qb_id: number; direction: string; created_at: string }[];

  // Group votes by QB
  const votesByQb = new Map<number, { direction: string; created_at: string }[]>();
  for (const vote of allVotes) {
    if (!votesByQb.has(vote.qb_id)) {
      votesByQb.set(vote.qb_id, []);
    }
    votesByQb.get(vote.qb_id)!.push(vote);
  }

  // Calculate trust score for each QB
  const quarterbacks: Quarterback[] = qbs.map(qb => ({
    ...qb,
    trust_score: calculateTrustScore(votesByQb.get(qb.id) || []),
  }));

  // Sort by name
  quarterbacks.sort((a, b) => a.name.localeCompare(b.name));

  return quarterbacks;
}

// Convert name to URL slug (e.g., "Patrick Mahomes" -> "patrick-mahomes")
export function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Get quarterback by ID with computed trust score and stats
export async function getQuarterbackById(id: number): Promise<QuarterbackWithStats | undefined> {
  await ensureInitialized();
  const db = getClient();

  const qbResult = await db.execute({
    sql: 'SELECT * FROM quarterbacks WHERE id = ?',
    args: [id],
  });

  if (qbResult.rows.length === 0) {
    return undefined;
  }

  const qb = qbResult.rows[0] as unknown as QuarterbackBase;

  // Get votes for this QB
  const votesResult = await db.execute({
    sql: 'SELECT direction, created_at FROM votes WHERE qb_id = ?',
    args: [id],
  });
  const votes = votesResult.rows as unknown as { direction: string; created_at: string }[];

  return {
    ...qb,
    trust_score: calculateTrustScore(votes),
    recent_vote_count: countRecentVotes(votes),
  };
}

// Get quarterback by slug with computed trust score and stats
export async function getQuarterbackBySlug(slug: string): Promise<QuarterbackWithStats | undefined> {
  await ensureInitialized();
  const db = getClient();

  // Get all QBs and find matching slug
  const qbResult = await db.execute('SELECT * FROM quarterbacks WHERE is_active = 1');
  const qbs = qbResult.rows as unknown as QuarterbackBase[];

  const qb = qbs.find(q => nameToSlug(q.name) === slug);

  if (!qb) {
    return undefined;
  }

  // Get votes for this QB
  const votesResult = await db.execute({
    sql: 'SELECT direction, created_at FROM votes WHERE qb_id = ?',
    args: [qb.id],
  });
  const votes = votesResult.rows as unknown as { direction: string; created_at: string }[];

  return {
    ...qb,
    trust_score: calculateTrustScore(votes),
    recent_vote_count: countRecentVotes(votes),
  };
}

// Record a vote (no longer updates trust_score column - it's computed dynamically)
export async function recordVote(qbId: number, direction: 'more' | 'less'): Promise<QuarterbackWithStats | null> {
  await ensureInitialized();
  const db = getClient();

  // Check if QB exists
  const qbResult = await db.execute({
    sql: 'SELECT id FROM quarterbacks WHERE id = ?',
    args: [qbId],
  });

  if (qbResult.rows.length === 0) {
    return null;
  }

  // Insert vote
  await db.execute({
    sql: 'INSERT INTO votes (qb_id, direction) VALUES (?, ?)',
    args: [qbId, direction],
  });

  // Return updated QB with new computed score
  return await getQuarterbackById(qbId) || null;
}

// Get trust history for a quarterback
export async function getTrustHistory(qbId: number, days: number = 30): Promise<TrustSnapshot[]> {
  await ensureInitialized();
  const result = await getClient().execute({
    sql: `SELECT * FROM trust_snapshots
          WHERE qb_id = ?
          ORDER BY snapshot_date DESC
          LIMIT ?`,
    args: [qbId, days],
  });
  return (result.rows as unknown as TrustSnapshot[]).reverse();
}

// Compute and store trust score snapshots for all QBs (for cron job)
export async function createTrustSnapshots(): Promise<{ qb_id: number; score: number }[]> {
  await ensureInitialized();
  const db = getClient();

  // Get all QBs with their current computed scores
  const quarterbacks = await getAllQuarterbacks();
  const today = new Date().toISOString().split('T')[0];

  const snapshots: { qb_id: number; score: number }[] = [];

  for (const qb of quarterbacks) {
    await db.execute({
      sql: `INSERT INTO trust_snapshots (qb_id, score, snapshot_date)
            VALUES (?, ?, ?)
            ON CONFLICT(qb_id, snapshot_date) DO UPDATE SET score = excluded.score`,
      args: [qb.id, qb.trust_score, today],
    });
    snapshots.push({ qb_id: qb.id, score: qb.trust_score });
  }

  return snapshots;
}

// Get vote stats for a QB (for transparency display)
export async function getVoteStats(qbId: number): Promise<{ total: number; recent: number; recentDays: number }> {
  await ensureInitialized();
  const db = getClient();

  const votesResult = await db.execute({
    sql: 'SELECT created_at FROM votes WHERE qb_id = ?',
    args: [qbId],
  });
  const votes = votesResult.rows as unknown as { created_at: string }[];

  return {
    total: votes.length,
    recent: countRecentVotes(votes),
    recentDays: HALF_LIFE_DAYS,
  };
}

// Get QBs with 7-day score movement
export async function getQuarterbacksWithMovement(): Promise<(Quarterback & { movement: number })[]> {
  await ensureInitialized();
  const db = getClient();

  // Get all QBs with current scores
  const quarterbacks = await getAllQuarterbacks();

  // Get snapshots from ~7 days ago for each QB
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const targetDate = sevenDaysAgo.toISOString().split('T')[0];

  // Use a subquery to get the most recent snapshot before the target date for each QB
  let snapshotsResult = await db.execute({
    sql: `SELECT ts.qb_id, ts.score
          FROM trust_snapshots ts
          INNER JOIN (
            SELECT qb_id, MAX(snapshot_date) as max_date
            FROM trust_snapshots
            WHERE snapshot_date <= ?
            GROUP BY qb_id
          ) latest ON ts.qb_id = latest.qb_id AND ts.snapshot_date = latest.max_date`,
    args: [targetDate],
  });

  // If no snapshots from 7+ days ago, fall back to the oldest available snapshots
  if (snapshotsResult.rows.length === 0) {
    snapshotsResult = await db.execute({
      sql: `SELECT ts.qb_id, ts.score
            FROM trust_snapshots ts
            INNER JOIN (
              SELECT qb_id, MIN(snapshot_date) as min_date
              FROM trust_snapshots
              GROUP BY qb_id
            ) oldest ON ts.qb_id = oldest.qb_id AND ts.snapshot_date = oldest.min_date`,
      args: [],
    });
  }

  const oldSnapshots = snapshotsResult.rows as unknown as { qb_id: number; score: number }[];

  // Create a map of old scores
  const oldScoreMap = new Map<number, number>();
  for (const snapshot of oldSnapshots) {
    oldScoreMap.set(snapshot.qb_id, snapshot.score);
  }

  // Calculate movement for each QB
  return quarterbacks.map(qb => ({
    ...qb,
    movement: oldScoreMap.has(qb.id)
      ? Math.round((qb.trust_score - oldScoreMap.get(qb.id)!) * 10) / 10
      : 0,
  }));
}

export default getClient;
