import { createClient, Client } from '@libsql/client';

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
      trust_score REAL DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

export interface Quarterback {
  id: number;
  name: string;
  team: string;
  espn_id: string;
  trust_score: number;
  created_at: string;
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

// Get all quarterbacks
export async function getAllQuarterbacks(): Promise<Quarterback[]> {
  await ensureInitialized();
  const result = await getClient().execute('SELECT * FROM quarterbacks ORDER BY name');
  return result.rows as unknown as Quarterback[];
}

// Get quarterback by ID
export async function getQuarterbackById(id: number): Promise<Quarterback | undefined> {
  await ensureInitialized();
  const result = await getClient().execute({
    sql: 'SELECT * FROM quarterbacks WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as Quarterback | undefined;
}

// Record a vote and update trust score
export async function recordVote(qbId: number, direction: 'more' | 'less'): Promise<Quarterback | null> {
  await ensureInitialized();
  const db = getClient();

  const qb = await getQuarterbackById(qbId);
  if (!qb) return null;

  // Insert vote
  await db.execute({
    sql: 'INSERT INTO votes (qb_id, direction) VALUES (?, ?)',
    args: [qbId, direction],
  });

  // Update trust score
  const change = direction === 'more' ? 1 : -1;

  // Apply diminishing returns near extremes
  let multiplier = 1;
  if (qb.trust_score > 90 && direction === 'more') multiplier = 0.3;
  else if (qb.trust_score < 10 && direction === 'less') multiplier = 0.3;
  else if (qb.trust_score > 80 && direction === 'more') multiplier = 0.5;
  else if (qb.trust_score < 20 && direction === 'less') multiplier = 0.5;

  const newScore = Math.max(0, Math.min(100, qb.trust_score + (change * multiplier)));

  await db.execute({
    sql: 'UPDATE quarterbacks SET trust_score = ? WHERE id = ?',
    args: [newScore, qbId],
  });

  // Record snapshot for today (upsert)
  const today = new Date().toISOString().split('T')[0];
  await db.execute({
    sql: `INSERT INTO trust_snapshots (qb_id, score, snapshot_date)
          VALUES (?, ?, ?)
          ON CONFLICT(qb_id, snapshot_date) DO UPDATE SET score = excluded.score`,
    args: [qbId, newScore, today],
  });

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

// Seed initial data
export async function seedQuarterbacks(qbs: { name: string; team: string; espn_id: string }[]) {
  await ensureInitialized();
  const db = getClient();

  for (const qb of qbs) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO quarterbacks (name, team, espn_id) VALUES (?, ?, ?)`,
      args: [qb.name, qb.team, qb.espn_id],
    });
  }

  // Create initial snapshots for new QBs
  const today = new Date().toISOString().split('T')[0];
  await db.execute({
    sql: `INSERT OR IGNORE INTO trust_snapshots (qb_id, score, snapshot_date)
          SELECT id, trust_score, ? FROM quarterbacks
          WHERE id NOT IN (SELECT qb_id FROM trust_snapshots)`,
    args: [today],
  });
}

export default getClient;
