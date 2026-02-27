-- CERP Database Schema

-- Roles: user, admin, superadmin
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Domains (research areas / interest domains)
CREATE TABLE IF NOT EXISTS domains (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT
);

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  location VARCHAR(255),
  club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  category VARCHAR(100),
  is_university_event BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements (club announcements scraped or posted)
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  source_url TEXT,
  club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  published_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Professors
CREATE TABLE IF NOT EXISTS professors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  email VARCHAR(255),
  profile_url TEXT,
  scholar_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Professor-Domain mapping
CREATE TABLE IF NOT EXISTS professor_domains (
  professor_id INTEGER REFERENCES professors(id) ON DELETE CASCADE,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, domain_id)
);

-- Research Publications
CREATE TABLE IF NOT EXISTS publications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(1000) NOT NULL,
  authors TEXT,
  abstract TEXT,
  journal VARCHAR(500),
  publication_year INTEGER,
  citation_count INTEGER DEFAULT 0,
  url TEXT,
  doi VARCHAR(255),
  professor_id INTEGER REFERENCES professors(id) ON DELETE SET NULL,
  domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search & filtering performance
CREATE INDEX idx_publications_year ON publications(publication_year);
CREATE INDEX idx_publications_citations ON publications(citation_count);
CREATE INDEX idx_publications_domain ON publications(domain_id);
CREATE INDEX idx_publications_professor ON publications(professor_id);
CREATE INDEX idx_publications_title ON publications USING gin(to_tsvector('english', title));
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_club ON events(club_id);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_announcements_club ON announcements(club_id);
CREATE INDEX idx_announcements_published ON announcements(published_at);
