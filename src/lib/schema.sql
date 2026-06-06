-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_completed INTEGER NOT NULL DEFAULT 0,
  site_title TEXT DEFAULT 'LinkGuide',
  site_domain TEXT,
  turnstile_site_key TEXT,
  turnstile_secret_key TEXT,
  turnstile_landing_create INTEGER NOT NULL DEFAULT 0,
  turnstile_login INTEGER NOT NULL DEFAULT 0,
  turnstile_signup INTEGER NOT NULL DEFAULT 0
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  base_path TEXT NOT NULL DEFAULT '/',
  is_active INTEGER NOT NULL DEFAULT 1,
  allow_guest_create INTEGER NOT NULL DEFAULT 0,
  turnstile_site_key TEXT,
  turnstile_secret_key TEXT,
  base_response TEXT NOT NULL DEFAULT '404',
  base_redirect_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Links table
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  domain_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('simple', 'custom_page', 'password')),
  password_hash TEXT,
  custom_page_config TEXT,
  stats_enabled INTEGER NOT NULL DEFAULT 1,
  turnstile_enabled INTEGER NOT NULL DEFAULT 0,
  redirect_delay INTEGER NOT NULL DEFAULT 0,
  allow_skip INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(short_code, domain_id)
);

-- Stats table
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  FOREIGN KEY (link_id) REFERENCES links(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code, domain_id);
CREATE INDEX IF NOT EXISTS idx_stats_link_id ON stats(link_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);

-- Blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
