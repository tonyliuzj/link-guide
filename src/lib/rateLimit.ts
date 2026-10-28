import { getDb } from '@/lib/db';

// Fixed-window rate limiter backed by SQLite, so limits survive restarts and are shared by every
// process using the same database file.
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
let lastPrune = 0;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const db = getDb();
  const now = Date.now();

  if (now - lastPrune > PRUNE_INTERVAL_MS) {
    lastPrune = now;
    db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(now);
  }

  const row = db.prepare(`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
    RETURNING count, reset_at
  `).get(key, now + windowMs, now, now, now + windowMs) as { count: number; reset_at: number };

  return {
    ok: row.count <= limit,
    retryAfter: Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
  };
}

export function resetRateLimit(key: string) {
  getDb().prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
}
