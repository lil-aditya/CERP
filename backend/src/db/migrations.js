const pool = require('./pool');

let hasRun = false;

function tableExists(tableName) {
  const row = pool.raw
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return Boolean(row);
}

function columnExists(tableName, columnName) {
  if (!tableExists(tableName)) return false;
  const columns = pool.raw.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(tableName, columnName, definition) {
  if (!columnExists(tableName, columnName)) {
    pool.raw.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function runMigrations() {
  if (hasRun) return;

  const db = pool.raw;

  db.exec(`
    CREATE TABLE IF NOT EXISTS db_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  if (tableExists('gmail_emails')) {
    addColumnIfMissing('gmail_emails', 'sanitized_subject', 'TEXT');
    addColumnIfMissing('gmail_emails', 'sanitized_snippet', 'TEXT');
    addColumnIfMissing('gmail_emails', 'sanitized_body_text', 'TEXT');
    addColumnIfMissing('gmail_emails', 'privacy_report', 'TEXT');
    addColumnIfMissing('gmail_emails', 'digest_summary', 'TEXT');
    addColumnIfMissing('gmail_emails', 'interest_tags', 'TEXT');
    addColumnIfMissing('gmail_emails', 'local_llm_status', 'TEXT');
    addColumnIfMissing('gmail_emails', 'digest_generated_at', 'TEXT');
    addColumnIfMissing('gmail_emails', 'anonymized_at', 'TEXT');
    addColumnIfMissing('gmail_emails', 'sender_domain', 'TEXT');
    addColumnIfMissing('gmail_emails', 'from_email_hash', 'TEXT');

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_gmail_emails_anonymized ON gmail_emails(anonymized_at);
      CREATE INDEX IF NOT EXISTS idx_gmail_emails_sender_domain ON gmail_emails(sender_domain);
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS semantic_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      user_id INTEGER DEFAULT 0,
      text_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      vector_json TEXT NOT NULL,
      source_preview TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_semantic_embeddings_entity
      ON semantic_embeddings(entity_type, entity_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_semantic_embeddings_model
      ON semantic_embeddings(provider, model);
  `);

  hasRun = true;
}

module.exports = {
  runMigrations,
  tableExists,
  columnExists,
};
