import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

const DB_PATH = process.env.DATABASE_URL || './data/linkguide.db';
let db: Database.Database | null = null;

type StatsByDateRow = { date: string; count: number };
export type LinkListRow = {
  id: number;
  short_code: string;
  destination_url: string;
  mode: string;
  expires_at: string | null;
  domain: string;
  base_path: string;
  click_count: number;
  owner_name: string;
};

export function getDb() {
  if (!db) {
    const dbDir = dirname(DB_PATH);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb();
  }
  return db;
}

function initDb() {
  const schema = readFileSync(join(process.cwd(), 'lib', 'schema.sql'), 'utf-8');
  db!.exec(schema);

  const setup = db!.prepare('SELECT * FROM setup WHERE id = 1').get();
  if (!setup) {
    db!.prepare('INSERT INTO setup (id, is_completed) VALUES (1, 0)').run();
  }

  // Create guest user (id=0) for guest-created links
  try {
    db!.exec(`INSERT INTO users (id, email, password_hash, role) VALUES (0, 'guest@system', '', 'user')`);
  } catch (e) {
    // Guest user already exists
  }

  // Add site settings columns to setup table
  try {
    db!.exec(`ALTER TABLE setup ADD COLUMN site_title TEXT DEFAULT 'LinkGuide'`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE setup ADD COLUMN site_domain TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Add missing columns to domains table
  try {
    db!.exec(`ALTER TABLE domains ADD COLUMN allow_guest_create INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE domains ADD COLUMN turnstile_site_key TEXT`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE domains ADD COLUMN turnstile_secret_key TEXT`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE domains ADD COLUMN base_response TEXT NOT NULL DEFAULT '404'`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE domains ADD COLUMN base_redirect_url TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Add missing columns to links table
  try {
    db!.exec(`ALTER TABLE links ADD COLUMN turnstile_enabled INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE links ADD COLUMN redirect_delay INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }
  try {
    db!.exec(`ALTER TABLE links ADD COLUMN allow_skip INTEGER NOT NULL DEFAULT 1`);
  } catch (e) {
    // Column already exists
  }

  // Initialize default blacklist
  const defaultBlacklist = [
    'dashboard', 'login', 'signup', 'setup', 'api', 'guest',
    'admin', 'settings', 'users', 'domains', 'links', 'blacklist',
    'account', 'profile', 'logout', 'auth'
  ];

  for (const path of defaultBlacklist) {
    try {
      db!.prepare('INSERT INTO blacklist (path, reason) VALUES (?, ?)').run(path, 'Application route');
    } catch (e) {
      // Path already exists
    }
  }
}

// Setup
export function isSetupCompleted() {
  const result = getDb().prepare('SELECT is_completed FROM setup WHERE id = 1').get() as { is_completed: number };
  return result?.is_completed === 1;
}

export function completeSetup() {
  getDb().prepare('UPDATE setup SET is_completed = 1 WHERE id = 1').run();
}

export function getSiteSettings() {
  return getDb().prepare('SELECT site_title, site_domain FROM setup WHERE id = 1').get() as { site_title: string; site_domain: string } | undefined;
}

export function updateSiteSettings(siteTitle: string, siteDomain: string) {
  return getDb().prepare('UPDATE setup SET site_title = ?, site_domain = ? WHERE id = 1').run(siteTitle, siteDomain);
}

// Users
export function createUser(email: string, passwordHash: string, role: 'admin' | 'user') {
  return getDb().prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, passwordHash, role);
}

export function getUserByEmail(email: string) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
}

export function getUserById(id: number) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
}

export function getAllUsers() {
  return getDb().prepare('SELECT id, email, role, created_at FROM users').all() as any[];
}

export function countAdminUsers() {
  const result = getDb().prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
  return result.count;
}

export function updateUser(id: number, data: { email?: string; role?: string }) {
  const fields = [];
  const values = [];

  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }

  if (fields.length === 0) return;

  values.push(id);
  return getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteUser(id: number) {
  return getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function updatePassword(id: number, passwordHash: string) {
  return getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

// Domains
export function createDomain(domain: string, basePath: string) {
  return getDb().prepare('INSERT INTO domains (domain, base_path) VALUES (?, ?)').run(domain, basePath);
}

export function getDomainByHostname(hostname: string) {
  return getDb().prepare('SELECT * FROM domains WHERE domain = ? AND is_active = 1').get(hostname) as any;
}

export function getAllDomains() {
  return getDb().prepare('SELECT * FROM domains ORDER BY created_at DESC').all();
}

export function getDomainById(id: number) {
  return getDb().prepare('SELECT * FROM domains WHERE id = ?').get(id) as any;
}

export function domainExists(domain: string, excludeId?: number) {
  const query = excludeId
    ? 'SELECT id FROM domains WHERE domain = ? AND id != ?'
    : 'SELECT id FROM domains WHERE domain = ?';
  const params = excludeId ? [domain, excludeId] : [domain];
  return !!getDb().prepare(query).get(...params);
}

export function updateDomain(id: number, data: {
  domain?: string;
  basePath?: string;
  isActive?: boolean;
  allowGuestCreate?: boolean;
  turnstileSiteKey?: string;
  turnstileSecretKey?: string;
  baseResponse?: string;
  baseRedirectUrl?: string;
}) {
  const fields = [];
  const values = [];

  if (data.domain !== undefined) { fields.push('domain = ?'); values.push(data.domain); }
  if (data.basePath !== undefined) { fields.push('base_path = ?'); values.push(data.basePath); }
  if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
  if (data.allowGuestCreate !== undefined) { fields.push('allow_guest_create = ?'); values.push(data.allowGuestCreate ? 1 : 0); }
  if (data.turnstileSiteKey !== undefined) { fields.push('turnstile_site_key = ?'); values.push(data.turnstileSiteKey); }
  if (data.turnstileSecretKey !== undefined) { fields.push('turnstile_secret_key = ?'); values.push(data.turnstileSecretKey); }
  if (data.baseResponse !== undefined) { fields.push('base_response = ?'); values.push(data.baseResponse); }
  if (data.baseRedirectUrl !== undefined) { fields.push('base_redirect_url = ?'); values.push(data.baseRedirectUrl); }

  if (fields.length === 0) return;

  values.push(id);
  return getDb().prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteDomain(id: number) {
  return getDb().prepare('DELETE FROM domains WHERE id = ?').run(id);
}

// Links
export function createLink(data: {
  shortCode: string;
  destinationUrl: string;
  domainId: number;
  userId: number;
  mode: string;
  passwordHash?: string;
  customPageConfig?: string;
  statsEnabled: boolean;
  expiresAt?: string;
}) {
  return getDb().prepare(`
    INSERT INTO links (short_code, destination_url, domain_id, user_id, mode, password_hash, custom_page_config, stats_enabled, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.shortCode,
    data.destinationUrl,
    data.domainId,
    data.userId,
    data.mode,
    data.passwordHash || null,
    data.customPageConfig || null,
    data.statsEnabled ? 1 : 0,
    data.expiresAt || null
  );
}

export function getLinkByShortCode(shortCode: string, domainId: number) {
  return getDb().prepare('SELECT * FROM links WHERE short_code = ? AND domain_id = ?').get(shortCode, domainId) as any;
}

export function getLinkById(id: number) {
  return getDb().prepare('SELECT * FROM links WHERE id = ?').get(id) as any;
}

export function getLinksByUserId(userId: number) {
  return getDb().prepare(`
    SELECT l.*, d.domain, d.base_path,
           (SELECT COUNT(*) FROM stats WHERE link_id = l.id) as click_count,
           CASE WHEN l.user_id = 0 THEN 'Guest' ELSE u.email END as owner_name
    FROM links l
    JOIN domains d ON l.domain_id = d.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.user_id = ?
    ORDER BY l.created_at DESC
  `).all(userId) as LinkListRow[];
}

export function getAllLinks() {
  return getDb().prepare(`
    SELECT l.*, d.domain, d.base_path,
           (SELECT COUNT(*) FROM stats WHERE link_id = l.id) as click_count,
           CASE WHEN l.user_id = 0 THEN 'Guest' ELSE u.email END as owner_name
    FROM links l
    JOIN domains d ON l.domain_id = d.id
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
  `).all() as LinkListRow[];
}

export function updateLink(id: number, data: Partial<{
  destinationUrl: string;
  mode: string;
  passwordHash: string;
  customPageConfig: string;
  statsEnabled: boolean;
  turnstileEnabled: boolean;
  redirectDelay: number;
  allowSkip: boolean;
  expiresAt: string;
}>) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.destinationUrl !== undefined) { fields.push('destination_url = ?'); values.push(data.destinationUrl); }
  if (data.mode !== undefined) { fields.push('mode = ?'); values.push(data.mode); }
  if (data.passwordHash !== undefined) { fields.push('password_hash = ?'); values.push(data.passwordHash); }
  if (data.customPageConfig !== undefined) { fields.push('custom_page_config = ?'); values.push(data.customPageConfig); }
  if (data.statsEnabled !== undefined) { fields.push('stats_enabled = ?'); values.push(data.statsEnabled ? 1 : 0); }
  if (data.turnstileEnabled !== undefined) { fields.push('turnstile_enabled = ?'); values.push(data.turnstileEnabled ? 1 : 0); }
  if (data.redirectDelay !== undefined) { fields.push('redirect_delay = ?'); values.push(data.redirectDelay); }
  if (data.allowSkip !== undefined) { fields.push('allow_skip = ?'); values.push(data.allowSkip ? 1 : 0); }
  if (data.expiresAt !== undefined) { fields.push('expires_at = ?'); values.push(data.expiresAt); }

  values.push(id);
  return getDb().prepare(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteLink(id: number) {
  getDb().prepare('DELETE FROM stats WHERE link_id = ?').run(id);
  return getDb().prepare('DELETE FROM links WHERE id = ?').run(id);
}

export function deleteLinksByUserId(userId: number) {
  const links = getDb().prepare('SELECT id FROM links WHERE user_id = ?').all(userId) as Array<{ id: number }>;
  for (const link of links) {
    getDb().prepare('DELETE FROM stats WHERE link_id = ?').run(link.id);
  }
  return getDb().prepare('DELETE FROM links WHERE user_id = ?').run(userId);
}

export function linkExists(shortCode: string, domainId: number) {
  const result = getDb().prepare('SELECT 1 FROM links WHERE short_code = ? AND domain_id = ?').get(shortCode, domainId);
  return !!result;
}

// Stats
export function createStat(linkId: number, ipAddress: string, userAgent: string, referrer: string, country?: string) {
  const ipHash = createHash('sha256').update(ipAddress).digest('hex');
  return getDb().prepare('INSERT INTO stats (link_id, ip_hash, user_agent, referrer, country) VALUES (?, ?, ?, ?, ?)').run(
    linkId, ipHash, userAgent, referrer, country || null
  );
}

export function getStatsByLinkId(linkId: number) {
  return getDb().prepare('SELECT * FROM stats WHERE link_id = ? ORDER BY visited_at DESC').all(linkId);
}

export function getStatsCount(linkId: number) {
  const result = getDb().prepare('SELECT COUNT(*) as count FROM stats WHERE link_id = ?').get(linkId) as { count: number };
  return result.count;
}

export function getStatsGroupedByDate(linkId: number, days: number = 30) {
  return getDb().prepare(`
    SELECT DATE(visited_at) as date, COUNT(*) as count
    FROM stats
    WHERE link_id = ? AND visited_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(visited_at)
    ORDER BY date ASC
  `).all(linkId, days) as StatsByDateRow[];
}

export function getAllStatsGroupedByDate(days: number = 90) {
  return getDb().prepare(`
    SELECT DATE(visited_at) as date, COUNT(*) as count
    FROM stats
    WHERE visited_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(visited_at)
    ORDER BY date ASC
  `).all(days) as StatsByDateRow[];
}

export function getStatsGroupedByDateForUser(userId: number, days: number = 90) {
  return getDb().prepare(`
    SELECT DATE(s.visited_at) as date, COUNT(*) as count
    FROM stats s
    JOIN links l ON s.link_id = l.id
    WHERE l.user_id = ? AND s.visited_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(s.visited_at)
    ORDER BY date ASC
  `).all(userId, days) as StatsByDateRow[];
}

// Blacklist
export function getAllBlacklist() {
  return getDb().prepare('SELECT * FROM blacklist ORDER BY created_at DESC').all();
}

export function createBlacklist(path: string, reason?: string) {
  return getDb().prepare('INSERT INTO blacklist (path, reason) VALUES (?, ?)').run(path, reason || null);
}

export function deleteBlacklist(id: number) {
  return getDb().prepare('DELETE FROM blacklist WHERE id = ?').run(id);
}

export function isBlacklisted(path: string) {
  const result = getDb().prepare('SELECT 1 FROM blacklist WHERE path = ?').get(path);
  return !!result;
}
