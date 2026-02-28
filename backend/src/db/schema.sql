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
