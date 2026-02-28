const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'cerp.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

/**
 * Thin wrapper around better-sqlite3 that exposes a .query() helper
 * so that every existing route file keeps working with minimal changes.
 *
 * PostgreSQL used $1, $2 … placeholders.  SQLite uses ?.
 * The helper converts on the fly.
 */
function pgToSqlite(sql, params = []) {
  // $1 $2 … → ?
  let idx = 0;
  const converted = sql.replace(/\$\d+/g, () => '?');
  return converted;
}

const pool = {
  /** Run a query and return { rows: [...] } like pg */
  query(sql, params = []) {
    const converted = pgToSqlite(sql, params);
    const trimmed = converted.trim().toUpperCase();

    if (
      trimmed.startsWith('SELECT') ||
      trimmed.startsWith('WITH') ||
      converted.includes('RETURNING')
    ) {
      // For RETURNING – SQLite doesn't support it natively.
      // We handle INSERT...RETURNING / UPDATE...RETURNING / DELETE...RETURNING
      if (converted.toUpperCase().includes('RETURNING')) {
        return handleReturning(converted, params);
      }
      const stmt = sqlite.prepare(converted);
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const stmt = sqlite.prepare(converted);
      const info = stmt.run(...params);
      return { rows: [], rowCount: info.changes, lastID: info.lastInsertRowid };
    }
  },

  /** For transaction support (used by users.js preferences) */
  connect() {
    return {
      query(sql, params) { return pool.query(sql, params); },
      release() { /* no-op for sqlite */ },
    };
  },

  /** Raw sqlite instance for advanced usage */
  raw: sqlite,
};

/**
 * Handle INSERT/UPDATE/DELETE … RETURNING *
 * Strategy: run the mutation, then SELECT the affected row(s).
 */
function handleReturning(sql, params) {
  const upperSql = sql.toUpperCase();

  // Split off the RETURNING clause
  const retIdx = upperSql.lastIndexOf('RETURNING');
  const mutationSql = sql.substring(0, retIdx).trim();
  const returningCols = sql.substring(retIdx + 'RETURNING'.length).trim(); // e.g. "* " or "id, name, email, role"

  if (upperSql.startsWith('INSERT')) {
    const stmt = sqlite.prepare(mutationSql);
    const info = stmt.run(...params);
    // Figure out the table name
    const tableMatch = mutationSql.match(/INSERT\s+INTO\s+(\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      const row = sqlite.prepare(`SELECT ${returningCols} FROM ${table} WHERE rowid = ?`).get(info.lastInsertRowid);
      return { rows: row ? [row] : [] };
    }
    return { rows: [] };
  }

  if (upperSql.startsWith('UPDATE')) {
    // For UPDATE … WHERE id = ? RETURNING …
    // We run the update, then select by the same WHERE clause
    const stmt = sqlite.prepare(mutationSql);
    const info = stmt.run(...params);

    // Extract table and WHERE
    const tableMatch = mutationSql.match(/UPDATE\s+(\w+)/i);
    const whereMatch = mutationSql.match(/WHERE\s+(.+)$/i);
    if (tableMatch && whereMatch) {
      const table = tableMatch[1];
      // The WHERE params are the last param(s). For our use case it's always the last one.
      const whereClause = whereMatch[1];
      const whereParamCount = (whereClause.match(/\?/g) || []).length;
      const whereParams = params.slice(params.length - whereParamCount);
      const row = sqlite.prepare(`SELECT ${returningCols} FROM ${table} WHERE ${whereClause}`).get(...whereParams);
      return { rows: row ? [row] : [] };
    }
    return { rows: [] };
  }

  if (upperSql.startsWith('DELETE')) {
    const stmt = sqlite.prepare(mutationSql);
    stmt.run(...params);
    return { rows: [] };
  }

  return { rows: [] };
}

module.exports = pool;
