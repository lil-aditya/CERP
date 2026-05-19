const { google } = require('googleapis');
const pool = require('../db/pool');
const { runMigrations } = require('../db/migrations');
const privacyEngine = require('./privacyEngine');
const localLlmService = require('./localLlmService');
const smartCategorizer = require('./smartCategorizer');

runMigrations();

/**
 * Gmail Service — handles OAuth client creation, email fetching,
 * and NLP-powered categorization using TF-IDF + fuzzy matching.
 */

// Create an OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Generate the Google consent URL
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',    // gets refresh_token
    prompt: 'consent',         // forces consent every time to ensure refresh_token
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    state: String(userId),     // pass CERP user ID through OAuth flow
  });
}

// Exchange authorization code for tokens
async function exchangeCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get an authenticated OAuth2 client for a user
function getAuthenticatedClient(userId) {
  const db = pool.raw;
  const row = db.prepare('SELECT * FROM gmail_tokens WHERE user_id = ?').get(userId);
  if (!row) return null;

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.token_expiry ? new Date(row.token_expiry).getTime() : undefined,
  });

  // Auto-refresh: when token refreshes, update DB
  oauth2Client.on('tokens', (tokens) => {
    const updates = {};
    if (tokens.access_token) updates.access_token = tokens.access_token;
    if (tokens.expiry_date) updates.token_expiry = new Date(tokens.expiry_date).toISOString();

    if (updates.access_token) {
      db.prepare(
        'UPDATE gmail_tokens SET access_token = ?, token_expiry = ? WHERE user_id = ?'
      ).run(updates.access_token, updates.token_expiry || null, userId);
    }
  });

  return oauth2Client;
}

// Store tokens after OAuth callback
function storeTokens(userId, tokens, gmailEmail) {
  const db = pool.raw;
  db.prepare(`
    INSERT INTO gmail_tokens (user_id, access_token, refresh_token, token_expiry, gmail_email)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, gmail_tokens.refresh_token),
      token_expiry = excluded.token_expiry,
      gmail_email = excluded.gmail_email,
      connected_at = datetime('now')
  `).run(
    userId,
    tokens.access_token,
    tokens.refresh_token || null,
    tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    gmailEmail || null
  );
}

// Disconnect Gmail for a user
function disconnectGmail(userId) {
  const db = pool.raw;
  db.prepare('DELETE FROM gmail_tokens WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM gmail_emails WHERE user_id = ?').run(userId);
}

// Check if user has Gmail connected
function isGmailConnected(userId) {
  const db = pool.raw;
  const row = db.prepare('SELECT id, gmail_email FROM gmail_tokens WHERE user_id = ?').get(userId);
  return row ? { connected: true, email: row.gmail_email } : { connected: false, email: null };
}

// Extract plain text body from Gmail message payload (recursive)
function extractBodyText(payload) {
  if (!payload) return '';

  // If this part has a text/plain body
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // If multipart, recurse into parts
  if (payload.parts) {
    // Prefer text/plain over text/html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // If no plain text, try to get html and strip tags
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000);
      }
    }
    // Recurse deeper (multipart/alternative, multipart/mixed)
    for (const part of payload.parts) {
      const result = extractBodyText(part);
      if (result) return result;
    }
  }

  return '';
}

// Fetch last N emails from Gmail API
async function fetchEmails(userId, maxResults = 50) {
  const oauth2Client = getAuthenticatedClient(userId);
  if (!oauth2Client) throw new Error('Gmail not connected');

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get message list
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:inbox',
  });

  const messages = listRes.data.messages || [];
  const emails = [];

  for (const msg of messages) {
    // Check if already fetched
    const db = pool.raw;
    const existing = db.prepare(
      'SELECT id FROM gmail_emails WHERE user_id = ? AND message_id = ?'
    ).get(userId, msg.id);
    if (existing) continue;

    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const fromRaw = getHeader('From');
      const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
      const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : fromRaw;
      const fromEmail = fromMatch ? fromMatch[2].trim() : fromRaw;

      // Extract body text from the full message payload
      let bodyText = '';
      try {
        bodyText = extractBodyText(detail.data.payload);
      } catch (e) { /* body extraction failed, use snippet */ }

      emails.push({
        message_id: msg.id,
        from_email: fromEmail.toLowerCase(),
        from_name: fromName,
        subject: getHeader('Subject'),
        snippet: detail.data.snippet || '',
        body_text: bodyText || detail.data.snippet || '',
        received_at: getHeader('Date') ? new Date(getHeader('Date')).toISOString() : null,
      });
    } catch (err) {
      console.log(`[Gmail] Failed to fetch message ${msg.id}: ${err.message}`);
    }
  }

  return emails;
}

async function privacyDigestEmail(email, index = 0) {
  const anonymized = privacyEngine.anonymizeEmail(email);
  const maxLlmPerSync = parseInt(process.env.EMAIL_DIGEST_MAX_LLM_PER_SYNC || '10', 10);
  const allowOllama = index < maxLlmPerSync;
  const digest = await localLlmService.generateEmailDigest(anonymized, { allowOllama });

  return {
    ...anonymized,
    digest_summary: digest.summary,
    interest_tags: JSON.stringify(digest.tags || []),
    local_llm_status: digest.status,
    digest_generated_at: new Date().toISOString(),
  };
}

async function privacyDigestEmails(emails) {
  const processed = [];
  for (let i = 0; i < emails.length; i++) {
    processed.push(await privacyDigestEmail(emails[i], i));
  }
  return processed;
}

function parseInterestTags(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return String(value).split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}

function toSafeEmailRow(row) {
  const safeRow = redactStoredRowIfNeeded(row);
  const subject = safeRow.sanitized_subject || safeRow.subject || '';
  const snippet = safeRow.digest_summary || safeRow.sanitized_snippet || safeRow.snippet || '';
  const bodyText = safeRow.sanitized_body_text || safeRow.body_text || '';

  return {
    ...safeRow,
    from_name: safeRow.from_name || (safeRow.sender_domain ? `[${safeRow.sender_domain}]` : ''),
    from_email: safeRow.sender_domain ? `[REDACTED_EMAIL]@${safeRow.sender_domain}` : '[REDACTED_EMAIL]',
    subject,
    snippet,
    body_text: bodyText,
    interest_tags: parseInterestTags(safeRow.interest_tags),
  };
}

function redactStoredRowIfNeeded(row) {
  if (row.anonymized_at) return row;

  const anonymized = privacyEngine.anonymizeEmail(row);
  const digest = localLlmService.extractiveDigest(anonymized, 'extractive_read_repair');
  const repaired = {
    ...row,
    ...anonymized,
    digest_summary: row.digest_summary || digest.summary,
    interest_tags: row.interest_tags || JSON.stringify(digest.tags || []),
    local_llm_status: row.local_llm_status || digest.status,
    digest_generated_at: row.digest_generated_at || new Date().toISOString(),
  };

  try {
    pool.raw.prepare(`
      UPDATE gmail_emails
      SET from_name = ?,
          subject = ?,
          snippet = ?,
          body_text = ?,
          sanitized_subject = ?,
          sanitized_snippet = ?,
          sanitized_body_text = ?,
          privacy_report = ?,
          digest_summary = ?,
          interest_tags = ?,
          local_llm_status = ?,
          digest_generated_at = ?,
          anonymized_at = ?,
          sender_domain = ?,
          from_email_hash = ?
      WHERE id = ?
    `).run(
      repaired.from_name,
      repaired.subject,
      repaired.snippet,
      (repaired.body_text || '').substring(0, 4000),
      repaired.sanitized_subject,
      repaired.sanitized_snippet,
      (repaired.sanitized_body_text || '').substring(0, 4000),
      repaired.privacy_report,
      repaired.digest_summary,
      repaired.interest_tags,
      repaired.local_llm_status,
      repaired.digest_generated_at,
      repaired.anonymized_at,
      repaired.sender_domain,
      repaired.from_email_hash,
      row.id
    );
  } catch (err) {
    console.log('[Gmail] Read-time redaction repair skipped:', err.message);
  }

  return repaired;
}

function backfillStoredEmailPrivacy(limit = 500) {
  const rows = pool.raw.prepare(`
    SELECT *
    FROM gmail_emails
    WHERE anonymized_at IS NULL
    ORDER BY fetched_at DESC
    LIMIT ?
  `).all(limit);

  for (const row of rows) {
    redactStoredRowIfNeeded(row);
  }

  return rows.length;
}

// Categorize emails using NLP-powered smart categorizer
// Uses TF-IDF, cosine similarity, fuzzy matching, stemming, synonyms
function categorizeEmails(emails, userId) {
  return smartCategorizer.categorizeEmails(emails, userId);
}

// Full sync: fetch → categorize → store
async function syncGmailEmails(userId, maxResults = 50) {
  const rawEmails = await fetchEmails(userId, maxResults);
  if (rawEmails.length === 0) return { fetched: 0, categorized: 0 };

  const privacySafeEmails = await privacyDigestEmails(rawEmails);
  const categorized = categorizeEmails(privacySafeEmails, userId);

  const db = pool.raw;
  const insert = db.prepare(`
    INSERT INTO gmail_emails (
      user_id, message_id, from_email, from_name, subject, snippet, body_text,
      sanitized_subject, sanitized_snippet, sanitized_body_text, privacy_report,
      digest_summary, interest_tags, local_llm_status, digest_generated_at,
      anonymized_at, sender_domain, from_email_hash,
      received_at, category, matched_club_id, confidence, is_event
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, message_id) DO UPDATE SET
      subject = excluded.subject,
      snippet = excluded.snippet,
      body_text = COALESCE(excluded.body_text, gmail_emails.body_text),
      sanitized_subject = excluded.sanitized_subject,
      sanitized_snippet = excluded.sanitized_snippet,
      sanitized_body_text = excluded.sanitized_body_text,
      privacy_report = excluded.privacy_report,
      digest_summary = excluded.digest_summary,
      interest_tags = excluded.interest_tags,
      local_llm_status = excluded.local_llm_status,
      digest_generated_at = excluded.digest_generated_at,
      anonymized_at = excluded.anonymized_at,
      sender_domain = excluded.sender_domain,
      from_email_hash = excluded.from_email_hash,
      category = excluded.category,
      matched_club_id = excluded.matched_club_id,
      confidence = excluded.confidence,
      is_event = excluded.is_event
  `);

  const insertMany = db.transaction((emails) => {
    let count = 0;
    for (const e of emails) {
      const result = insert.run(
        userId, e.message_id, e.from_email, e.from_name, e.subject, e.snippet,
        (e.body_text || '').substring(0, 4000),
        e.sanitized_subject, e.sanitized_snippet,
        (e.sanitized_body_text || '').substring(0, 4000),
        e.privacy_report, e.digest_summary, e.interest_tags, e.local_llm_status,
        e.digest_generated_at, e.anonymized_at, e.sender_domain, e.from_email_hash,
        e.received_at, e.category, e.matched_club_id, e.confidence, e.is_event
      );
      if (result.changes > 0) count++;
    }
    return count;
  });

  const newCount = insertMany(categorized);
  return { fetched: rawEmails.length, categorized: newCount };
}

async function recategorizeAllEmails(userId) {
  const db = pool.raw;
  const existingEmails = db.prepare(
    'SELECT * FROM gmail_emails WHERE user_id = ?'
  ).all(userId);

  if (existingEmails.length === 0) return 0;

  const privacySafeEmails = [];
  for (let i = 0; i < existingEmails.length; i++) {
    const row = existingEmails[i];
    const source = {
      ...row,
      subject: row.sanitized_subject || row.subject || '',
      snippet: row.sanitized_snippet || row.snippet || '',
      body_text: row.sanitized_body_text || row.body_text || '',
    };
    privacySafeEmails.push(await privacyDigestEmail(source, i));
  }

  const categorized = categorizeEmails(privacySafeEmails, userId);

  const update = db.prepare(`
    UPDATE gmail_emails
    SET from_name = ?,
        subject = ?,
        snippet = ?,
        body_text = ?,
        sanitized_subject = ?,
        sanitized_snippet = ?,
        sanitized_body_text = ?,
        privacy_report = ?,
        digest_summary = ?,
        interest_tags = ?,
        local_llm_status = ?,
        digest_generated_at = ?,
        anonymized_at = ?,
        sender_domain = ?,
        from_email_hash = ?,
        category = ?,
        matched_club_id = ?,
        confidence = ?,
        is_event = ?
    WHERE id = ?
  `);

  const updateAll = db.transaction((emails) => {
    let updated = 0;
    for (const email of emails) {
      update.run(
        email.from_name,
        email.subject,
        email.snippet,
        (email.body_text || '').substring(0, 4000),
        email.sanitized_subject,
        email.sanitized_snippet,
        (email.sanitized_body_text || '').substring(0, 4000),
        email.privacy_report,
        email.digest_summary,
        email.interest_tags,
        email.local_llm_status,
        email.digest_generated_at,
        email.anonymized_at,
        email.sender_domain,
        email.from_email_hash,
        email.category,
        email.matched_club_id,
        email.confidence,
        email.is_event,
        email.id
      );
      updated++;
    }
    return updated;
  });

  return updateAll(categorized.map((email, index) => ({
    ...email,
    id: existingEmails[index].id,
  })));
}

// Get categorized emails for a user, filtered by their preferences
function getCategorizedEmails(userId, { category, club_id, preferred_only, limit = 50 } = {}) {
  const db = pool.raw;

  let query = `
    SELECT ge.*, c.name as club_name
    FROM gmail_emails ge
    LEFT JOIN clubs c ON ge.matched_club_id = c.id
    WHERE ge.user_id = ?
  `;
  const params = [userId];

  if (category) {
    query += ' AND ge.category = ?';
    params.push(category);
  }

  if (club_id) {
    query += ' AND ge.matched_club_id = ?';
    params.push(parseInt(club_id));
  }

  if (preferred_only) {
    query += ' AND ge.matched_club_id IN (SELECT club_id FROM user_clubs WHERE user_id = ?)';
    params.push(userId);
  }

  query += ' ORDER BY ge.received_at DESC LIMIT ?';
  params.push(parseInt(limit));

  return db.prepare(query).all(params).map(toSafeEmailRow);
}

module.exports = {
  createOAuth2Client,
  getAuthUrl,
  exchangeCode,
  storeTokens,
  disconnectGmail,
  isGmailConnected,
  fetchEmails,
  categorizeEmails,
  syncGmailEmails,
  getCategorizedEmails,
  recategorizeAllEmails,
  backfillStoredEmailPrivacy,
};
