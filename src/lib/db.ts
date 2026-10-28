import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { normalizeEmail } from './validation';
import { getHostnameCandidates, normalizeBasePath, normalizeDomain } from './domainUtils';
import type { BlacklistItem, Domain, Link, SiteSettings, User, UserListItem } from '@/types/models';

const DB_PATH = process.env.DATABASE_URL || './data/linkguide.db';
// Next.js can load this module once per route bundle, so the connection lives on globalThis and
// every bundle shares a single handle.
const globalState = globalThis as typeof globalThis & { __linkGuideDb?: Database.Database | null };
function getHandle() {
  return globalState.__linkGuideDb ?? null;
}
function setHandle(handle: Database.Database | null) {
  globalState.__linkGuideDb = handle;
}

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
  let db = getHandle();
  if (!db) {
    const dbDir = dirname(DB_PATH);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    setHandle(db);
    initDb(db);
  }
  return db;
}

// Writes a consistent snapshot of the live database to destPath.
export async function backupDatabase(destPath: string) {
  await getDb().backup(destPath);
}

const REQUIRED_RESTORE_TABLES = ['users', 'domains', 'links', 'stats', 'settings'];

// Checks that a file is a usable LinkGuide database before it replaces the live one.
export function validateBackupFile(filePath: string) {
  let candidate: Database.Database | null = null;
  try {
    candidate = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = candidate.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') return 'The file is corrupted';

    const tables = new Set((candidate.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((row) => row.name));
    const missing = REQUIRED_RESTORE_TABLES.filter((table) => !tables.has(table));
    if (missing.length > 0) return `Not a LinkGuide database (missing: ${missing.join(', ')})`;

    const admins = candidate.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number };
    if (admins.count === 0) return 'The backup has no admin user, so nobody could log in after restoring it';

    return null;
  } catch {
    return 'The file is not a valid SQLite database';
  } finally {
    candidate?.close();
  }
}

const RESTORE_TABLES = ['settings', 'users', 'domains', 'links', 'stats', 'blacklist'];

// Replaces the data in the live database with a validated backup. The rows are copied inside one
// transaction instead of swapping the file, so other processes using the same database stay valid.
// The previous contents are first saved next to the database as `<name>.pre-restore`. Everyone is
// signed out afterwards, and pending emailed tokens are dropped.
export async function restoreDatabase(uploadedPath: string) {
  const database = getDb();
  await database.backup(`${DB_PATH}.pre-restore`);

  database.prepare('ATTACH DATABASE ? AS restore').run(uploadedPath);
  database.pragma('foreign_keys = OFF');
  try {
    database.transaction(() => {
      for (const table of RESTORE_TABLES) {
        const liveColumns = (database.prepare(`PRAGMA main.table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name);
        const backupColumns = new Set((database.prepare(`PRAGMA restore.table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name));
        // Older backups may lack newer columns; those take their defaults.
        const shared = liveColumns.filter((column) => backupColumns.has(column)).map((column) => `"${column}"`).join(', ');

        database.exec(`DELETE FROM main.${table}`);
        database.exec(`INSERT INTO main.${table} (${shared}) SELECT ${shared} FROM restore.${table}`);
      }

      database.exec('DELETE FROM main.password_resets');
      database.exec('DELETE FROM main.email_verifications');
      database.exec("INSERT OR IGNORE INTO main.users (id, email, password_hash, role) VALUES (0, 'guest@system', '', 'user')");
      database.exec('INSERT OR IGNORE INTO main.settings (id, is_completed) VALUES (1, 0)');
      database.exec("UPDATE main.users SET session_valid_after = CAST(strftime('%s', 'now') AS INTEGER)");

      if ((database.pragma('foreign_key_check') as unknown[]).length > 0) {
        throw new Error('The backup contains rows that reference missing data');
      }
    })();
  } finally {
    database.pragma('foreign_keys = ON');
    database.exec('DETACH DATABASE restore');
  }

  migrateEmailsToLowercase();
}

function initDb(db: Database.Database) {
  migrateSetupTableToSettings();
  migrateAddSecurityFields();

  const schema = readFileSync(join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf-8');
  db.exec(schema);

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!settings) {
    db.prepare('INSERT INTO settings (id, is_completed) VALUES (1, 0)').run();
  }

  // Create guest user (id=0) for guest-created links
  try {
    db.exec(`INSERT INTO users (id, email, password_hash, role) VALUES (0, 'guest@system', '', 'user')`);
  } catch {
    // Guest user already exists
  }

  // Add site settings columns to settings table
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN site_title TEXT DEFAULT 'LinkGuide'`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN site_domain TEXT`);
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE settings ADD COLUMN stats_retention_days INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  migrateSetupRowToSettings();

  // Add session invalidation column to users table
  try {
    db.exec(`ALTER TABLE users ADD COLUMN session_valid_after INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  migrateEmailsToLowercase();

  try {
    db.exec(`ALTER TABLE email_verifications ADD COLUMN new_email TEXT`);
  } catch {
    // Column already exists
  }

  // Existing accounts predate email verification, so they default to verified
  try {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`);
  } catch {
    // Column already exists
  }

  // Add missing columns to domains table
  try {
    db.exec(`ALTER TABLE domains ADD COLUMN allow_guest_create INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE domains ADD COLUMN turnstile_site_key TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE domains ADD COLUMN turnstile_secret_key TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE domains ADD COLUMN base_response TEXT NOT NULL DEFAULT '404'`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE domains ADD COLUMN base_redirect_url TEXT`);
  } catch {
    // Column already exists
  }

  // Add missing columns to links table
  try {
    db.exec(`ALTER TABLE links ADD COLUMN turnstile_enabled INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE links ADD COLUMN redirect_delay INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE links ADD COLUMN allow_skip INTEGER NOT NULL DEFAULT 1`);
  } catch {
    // Column already exists
  }

  // Initialize default blacklist
  const defaultBlacklist = [
    'dashboard', 'login', 'signup', 'setup', 'api', 'guest',
    'admin', 'settings', 'users', 'domains', 'links', 'blacklist',
    'account', 'profile', 'logout', 'auth',
    'forgot-password', 'reset-password', 'verify-email'
  ];

  for (const path of defaultBlacklist) {
    try {
      db.prepare('INSERT INTO blacklist (path, reason) VALUES (?, ?)').run(path, 'Application route');
    } catch {
      // Path already exists
    }
  }
}

// Emails are matched case-insensitively. Lowercase the stored ones, leaving any that would collide
// with another account untouched so no account is lost.
function migrateEmailsToLowercase() {
  const users = getHandle()!.prepare('SELECT id, email FROM users WHERE id != 0').all() as Array<{ id: number; email: string }>;
  const taken = new Set(users.map((user) => user.email));
  const update = getHandle()!.prepare('UPDATE users SET email = ? WHERE id = ?');

  for (const user of users) {
    const lowered = normalizeEmail(user.email);
    if (lowered === user.email || taken.has(lowered)) continue;
    update.run(lowered, user.id);
    taken.delete(user.email);
    taken.add(lowered);
  }

  try {
    getHandle()!.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE)');
  } catch {
    console.warn('Duplicate emails differing only by case exist; resolve them to enforce case-insensitive uniqueness.');
  }
}

function tableExists(tableName: string) {
  return !!getHandle()!.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
}

function columnExists(tableName: string, columnName: string) {
  const columns = getHandle()!.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function migrateSetupTableToSettings() {
  if (tableExists('setup') && !tableExists('settings')) {
    getHandle()!.exec('ALTER TABLE setup RENAME TO settings');
  }
}

function migrateAddSecurityFields() {
  if (!tableExists('settings')) return;

  const fieldsToAdd = [
    { name: 'turnstile_site_key', type: 'TEXT' },
    { name: 'turnstile_secret_key', type: 'TEXT' },
    { name: 'turnstile_landing_create', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'turnstile_login', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'turnstile_signup', type: 'INTEGER NOT NULL DEFAULT 0' }
  ];

  for (const field of fieldsToAdd) {
    if (!columnExists('settings', field.name)) {
      getHandle()!.exec(`ALTER TABLE settings ADD COLUMN ${field.name} ${field.type}`);
    }
  }
}

function migrateSetupRowToSettings() {
  if (!tableExists('setup') || !tableExists('settings')) return;

  const setup = getHandle()!.prepare('SELECT * FROM setup WHERE id = 1').get() as {
    is_completed?: number;
    site_title?: string | null;
    site_domain?: string | null;
  } | undefined;

  if (!setup) return;

  const settings = getHandle()!.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!settings) {
    getHandle()!.prepare('INSERT INTO settings (id, is_completed) VALUES (1, ?)').run(setup.is_completed ?? 0);
  } else if (setup.is_completed !== undefined) {
    getHandle()!.prepare('UPDATE settings SET is_completed = ? WHERE id = 1').run(setup.is_completed);
  }

  if (columnExists('settings', 'site_title') && columnExists('setup', 'site_title') && setup.site_title !== undefined) {
    getHandle()!.prepare('UPDATE settings SET site_title = ? WHERE id = 1').run(setup.site_title);
  }

  if (columnExists('settings', 'site_domain') && columnExists('setup', 'site_domain') && setup.site_domain !== undefined) {
    getHandle()!.prepare('UPDATE settings SET site_domain = ? WHERE id = 1').run(setup.site_domain);
  }

  getHandle()!.exec('DROP TABLE setup');
}

// Settings
export function isSetupCompleted() {
  const result = getDb().prepare('SELECT is_completed FROM settings WHERE id = 1').get() as { is_completed: number };
  return result?.is_completed === 1;
}

export function completeSetup() {
  getDb().prepare('UPDATE settings SET is_completed = 1 WHERE id = 1').run();
}

export function getSiteSettings() {
  return getDb().prepare('SELECT site_title, site_domain, turnstile_site_key, turnstile_secret_key, turnstile_landing_create, turnstile_login, turnstile_signup, stats_retention_days FROM settings WHERE id = 1').get() as SiteSettings | undefined;
}

export function updateSiteSettings(
  siteTitle: string,
  siteDomain: string,
  turnstileSiteKey?: string,
  turnstileSecretKey?: string,
  turnstileLandingCreate?: boolean,
  turnstileLogin?: boolean,
  turnstileSignup?: boolean,
  statsRetentionDays?: number
) {
  return getDb().prepare(
    'UPDATE settings SET site_title = ?, site_domain = ?, turnstile_site_key = ?, turnstile_secret_key = ?, turnstile_landing_create = ?, turnstile_login = ?, turnstile_signup = ?, stats_retention_days = COALESCE(?, stats_retention_days) WHERE id = 1'
  ).run(
    siteTitle,
    normalizeDomain(siteDomain),
    turnstileSiteKey || null,
    turnstileSecretKey || null,
    turnstileLandingCreate ? 1 : 0,
    turnstileLogin ? 1 : 0,
    turnstileSignup ? 1 : 0,
    statsRetentionDays ?? null
  );
}

// Users
export function createUser(email: string, passwordHash: string, role: 'admin' | 'user', emailVerified = true) {
  return getDb().prepare('INSERT INTO users (email, password_hash, role, email_verified) VALUES (?, ?, ?, ?)').run(normalizeEmail(email), passwordHash, role, emailVerified ? 1 : 0);
}

export function getUserByEmail(email: string) {
  return getDb().prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim()) as User | undefined;
}

export function getUserById(id: number) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getAllUsers() {
  return getDb().prepare('SELECT id, email, role, created_at FROM users').all() as UserListItem[];
}

export function countAdminUsers() {
  const result = getDb().prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
  return result.count;
}

export function updateUser(id: number, data: { email?: string; role?: string }) {
  const fields = [];
  const values = [];

  if (data.email !== undefined) { fields.push('email = ?'); values.push(normalizeEmail(data.email)); }
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

// Sessions issued before this unix time (seconds) are no longer valid
export function invalidateUserSessions(id: number) {
  return getDb().prepare("UPDATE users SET session_valid_after = CAST(strftime('%s', 'now') AS INTEGER) WHERE id = ?").run(id);
}

export function getUserSessionInfo(id: number) {
  return getDb().prepare('SELECT email, role, session_valid_after FROM users WHERE id = ?').get(id) as
    Pick<User, 'email' | 'role' | 'session_valid_after'> | undefined;
}

// Email verification
export function markEmailVerified(userId: number) {
  return getDb().prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(userId);
}

// A token without newEmail verifies the account's current address (signup). A token with newEmail
// confirms a change of address: the account only switches to it once the link is used.
export function createEmailVerification(userId: number, tokenHash: string, expiresAt: string, newEmail?: string) {
  const database = getDb();
  const kind = newEmail ? 'new_email IS NOT NULL' : 'new_email IS NULL';
  database.prepare(`DELETE FROM email_verifications WHERE (user_id = ? AND ${kind}) OR expires_at < datetime('now')`).run(userId);
  return database.prepare('INSERT INTO email_verifications (user_id, token_hash, expires_at, new_email) VALUES (?, ?, ?, ?)')
    .run(userId, tokenHash, expiresAt, newEmail ? normalizeEmail(newEmail) : null);
}

export type EmailVerificationResult = 'ok' | 'invalid' | 'taken';

export function consumeEmailVerification(tokenHash: string): EmailVerificationResult {
  const database = getDb();
  return database.transaction((): EmailVerificationResult => {
    const row = database.prepare("SELECT user_id, new_email FROM email_verifications WHERE token_hash = ? AND expires_at > datetime('now')").get(tokenHash) as
      { user_id: number; new_email: string | null } | undefined;
    if (!row) return 'invalid';

    if (row.new_email) {
      const owner = getUserByEmail(row.new_email);
      if (owner && owner.id !== row.user_id) return 'taken';
      database.prepare('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?').run(row.new_email, row.user_id);
      database.prepare('DELETE FROM email_verifications WHERE token_hash = ?').run(tokenHash);
    } else {
      markEmailVerified(row.user_id);
      database.prepare('DELETE FROM email_verifications WHERE user_id = ? AND new_email IS NULL').run(row.user_id);
    }
    return 'ok';
  })();
}

// Password resets
export function createPasswordReset(userId: number, tokenHash: string, expiresAt: string) {
  const database = getDb();
  database.prepare("DELETE FROM password_resets WHERE user_id = ? OR expires_at < datetime('now')").run(userId);
  return database.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(userId, tokenHash, expiresAt);
}

export function getValidPasswordReset(tokenHash: string) {
  return getDb().prepare("SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > datetime('now')").get(tokenHash) as
    { id: number; user_id: number } | undefined;
}

export function deletePasswordResetsForUser(userId: number) {
  return getDb().prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
}

// Domains
export function createDomain(
  domain: string,
  basePath: string,
  isActive: boolean = true,
  allowGuestCreate: boolean = false,
  turnstileSiteKey?: string,
  turnstileSecretKey?: string,
  baseResponse: string = 'default',
  baseRedirectUrl?: string | null
) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    throw new Error('Invalid domain');
  }

  return getDb().prepare(
    'INSERT INTO domains (domain, base_path, is_active, allow_guest_create, turnstile_site_key, turnstile_secret_key, base_response, base_redirect_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    normalizedDomain,
    normalizeBasePath(basePath),
    isActive ? 1 : 0,
    allowGuestCreate ? 1 : 0,
    turnstileSiteKey || null,
    turnstileSecretKey || null,
    baseResponse,
    baseRedirectUrl || null
  );
}

export function getDomainByHostname(hostname: string) {
  const candidates = getHostnameCandidates(hostname);
  if (candidates.length === 0) return null;

  const domains = getDb().prepare('SELECT * FROM domains WHERE is_active = 1').all() as Domain[];
  for (const candidate of candidates) {
    const domain = domains.find((item) => normalizeDomain(item.domain) === candidate);
    if (domain) return domain;
  }

  return null;
}

export function getAllDomains() {
  return getDb().prepare('SELECT * FROM domains ORDER BY created_at DESC').all() as Domain[];
}

export function getDomainById(id: number) {
  return getDb().prepare('SELECT * FROM domains WHERE id = ?').get(id) as Domain | undefined;
}

export function domainExists(domain: string, excludeId?: number) {
  const normalizedDomain = normalizeDomain(domain);
  const query = excludeId
    ? 'SELECT id FROM domains WHERE domain = ? AND id != ?'
    : 'SELECT id FROM domains WHERE domain = ?';
  const params = excludeId ? [normalizedDomain, excludeId] : [normalizedDomain];
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
  baseRedirectUrl?: string | null;
}) {
  const fields = [];
  const values = [];

  if (data.domain !== undefined) {
    const normalizedDomain = normalizeDomain(data.domain);
    if (!normalizedDomain) {
      throw new Error('Invalid domain');
    }
    fields.push('domain = ?');
    values.push(normalizedDomain);
  }
  if (data.basePath !== undefined) { fields.push('base_path = ?'); values.push(normalizeBasePath(data.basePath)); }
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
  const database = getDb();
  return database.transaction((domainId: number) => {
    database.prepare('DELETE FROM stats WHERE link_id IN (SELECT id FROM links WHERE domain_id = ?)').run(domainId);
    database.prepare('DELETE FROM links WHERE domain_id = ?').run(domainId);
    return database.prepare('DELETE FROM domains WHERE id = ?').run(domainId);
  })(id);
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
  turnstileEnabled?: boolean;
  redirectDelay?: number;
  allowSkip?: boolean;
  expiresAt?: string | null;
}) {
  return getDb().prepare(`
    INSERT INTO links (short_code, destination_url, domain_id, user_id, mode, password_hash, custom_page_config, stats_enabled, turnstile_enabled, redirect_delay, allow_skip, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.shortCode,
    data.destinationUrl,
    data.domainId,
    data.userId,
    data.mode,
    data.passwordHash ?? null,
    data.customPageConfig ?? null,
    data.statsEnabled ? 1 : 0,
    data.turnstileEnabled ? 1 : 0,
    data.redirectDelay ?? 0,
    data.allowSkip === undefined ? 1 : (data.allowSkip ? 1 : 0),
    data.expiresAt ?? null
  );
}

export function getLinkByShortCode(shortCode: string, domainId: number) {
  return getDb().prepare('SELECT * FROM links WHERE short_code = ? AND domain_id = ?').get(shortCode, domainId) as Link | undefined;
}

export function getLinkById(id: number) {
  return getDb().prepare('SELECT * FROM links WHERE id = ?').get(id) as Link | undefined;
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
  passwordHash: string | null;
  customPageConfig: string | null;
  statsEnabled: boolean;
  turnstileEnabled: boolean;
  redirectDelay: number;
  allowSkip: boolean;
  expiresAt: string | null;
}>) {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (data.destinationUrl !== undefined) { fields.push('destination_url = ?'); values.push(data.destinationUrl); }
  if (data.mode !== undefined) { fields.push('mode = ?'); values.push(data.mode); }
  if (data.passwordHash !== undefined) { fields.push('password_hash = ?'); values.push(data.passwordHash); }
  if (data.customPageConfig !== undefined) { fields.push('custom_page_config = ?'); values.push(data.customPageConfig); }
  if (data.statsEnabled !== undefined) { fields.push('stats_enabled = ?'); values.push(data.statsEnabled ? 1 : 0); }
  if (data.turnstileEnabled !== undefined) { fields.push('turnstile_enabled = ?'); values.push(data.turnstileEnabled ? 1 : 0); }
  if (data.redirectDelay !== undefined) { fields.push('redirect_delay = ?'); values.push(data.redirectDelay); }
  if (data.allowSkip !== undefined) { fields.push('allow_skip = ?'); values.push(data.allowSkip ? 1 : 0); }
  if (data.expiresAt !== undefined) { fields.push('expires_at = ?'); values.push(data.expiresAt); }

  if (fields.length === 0) return;

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
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastStatsPurge = 0;

// Deletes click records older than the configured retention (0 keeps everything).
export function purgeOldStats(force = false) {
  const now = Date.now();
  if (!force && now - lastStatsPurge < PURGE_INTERVAL_MS) return 0;
  lastStatsPurge = now;

  const days = getSiteSettings()?.stats_retention_days ?? 0;
  if (days <= 0) return 0;
  return getDb().prepare("DELETE FROM stats WHERE visited_at < datetime('now', '-' || ? || ' days')").run(days).changes;
}

export function createStat(linkId: number, ipAddress: string, userAgent: string, referrer: string, country?: string) {
  const ipHash = createHash('sha256').update(ipAddress).digest('hex');
  purgeOldStats();
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

export interface StatsBreakdown {
  referrers: { label: string; count: number }[];
  countries: { label: string; count: number }[];
  browsers: { label: string; count: number }[];
}

function browserFromUserAgent(ua: string): string {
  if (!ua) return 'Unknown';
  if (/bot|crawl|spider|slurp|preview/i.test(ua)) return 'Bot';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function referrerHost(ref: string): string {
  if (!ref) return 'Direct';
  try { return new URL(ref).hostname; } catch { return 'Direct'; }
}

function topN(counts: Map<string, number>, n = 5) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

// Breakdown of visits by referrer, country and browser. Pass a userId to scope to that user's links.
export function getStatsBreakdown(userId?: number, days: number = 90): StatsBreakdown {
  const rows = getDb().prepare(`
    SELECT s.user_agent, s.referrer, s.country
    FROM stats s
    JOIN links l ON s.link_id = l.id
    WHERE s.visited_at >= datetime('now', '-' || ? || ' days')
      AND (? IS NULL OR l.user_id = ?)
  `).all(days, userId ?? null, userId ?? null) as { user_agent: string | null; referrer: string | null; country: string | null }[];

  const referrers = new Map<string, number>();
  const countries = new Map<string, number>();
  const browsers = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);

  for (const r of rows) {
    bump(referrers, referrerHost(r.referrer || ''));
    bump(countries, r.country || 'Unknown');
    bump(browsers, browserFromUserAgent(r.user_agent || ''));
  }
  return { referrers: topN(referrers), countries: topN(countries), browsers: topN(browsers) };
}

// Blacklist
export function getAllBlacklist() {
  return getDb().prepare('SELECT * FROM blacklist ORDER BY created_at DESC').all() as BlacklistItem[];
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
