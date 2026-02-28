-- CERP Database Schema (SQLite)

-- Users table  (role is TEXT: user | admin | superadmin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user','admin','superadmin')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Domains (research areas / interest domains)
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- User-selected clubs (many-to-many)
CREATE TABLE IF NOT EXISTS user_clubs (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, club_id)
);

-- User-selected domains (many-to-many)
CREATE TABLE IF NOT EXISTS user_domains (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, domain_id)
);

-- Events (club events, university events)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  end_date TEXT,
  location TEXT,
  club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  category TEXT,
  is_university_event INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Announcements (club announcements scraped or posted)
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  published_at TEXT,
  scraped_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Professors
CREATE TABLE IF NOT EXISTS professors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department TEXT,
  email TEXT,
  profile_url TEXT,
  scholar_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Professor-Domain mapping
CREATE TABLE IF NOT EXISTS professor_domains (
  professor_id INTEGER REFERENCES professors(id) ON DELETE CASCADE,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, domain_id)
);

-- Research Publications
CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  authors TEXT,
  abstract TEXT,
  journal TEXT,
  publication_year INTEGER,
  citation_count INTEGER DEFAULT 0,
  url TEXT,
  doi TEXT,
  professor_id INTEGER REFERENCES professors(id) ON DELETE SET NULL,
  domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL,
  scraped_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Gmail OAuth tokens (one per user, encrypted refresh token)
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TEXT,
  gmail_email TEXT,
  connected_at TEXT DEFAULT (datetime('now'))
);

-- Cached Gmail emails (normalized)
CREATE TABLE IF NOT EXISTS gmail_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  from_email TEXT,
  from_name TEXT,
  subject TEXT,
  snippet TEXT,
  body_text TEXT,
  received_at TEXT,
  category TEXT,
  matched_club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  confidence REAL DEFAULT 0,
  is_event INTEGER DEFAULT 0,
  fetched_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, message_id)
);

-- Email matching rules (keyword + sender patterns per club)
CREATE TABLE IF NOT EXISTS email_match_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('sender', 'keyword')),
  pattern TEXT NOT NULL,
  UNIQUE(club_id, rule_type, pattern)
);

-- Indexes for search & filtering performance
CREATE INDEX IF NOT EXISTS idx_publications_year ON publications(publication_year);
CREATE INDEX IF NOT EXISTS idx_publications_citations ON publications(citation_count);
CREATE INDEX IF NOT EXISTS idx_publications_domain ON publications(domain_id);
CREATE INDEX IF NOT EXISTS idx_publications_professor ON publications(professor_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_club ON events(club_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_announcements_club ON announcements(club_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_gmail_emails_user ON gmail_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_emails_category ON gmail_emails(category);
CREATE INDEX IF NOT EXISTS idx_gmail_emails_club ON gmail_emails(matched_club_id);
CREATE INDEX IF NOT EXISTS idx_gmail_emails_received ON gmail_emails(received_at);
