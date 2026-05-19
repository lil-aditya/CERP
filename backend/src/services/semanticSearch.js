const crypto = require('crypto');
const axios = require('axios');
const pool = require('../db/pool');
const { runMigrations } = require('../db/migrations');

runMigrations();

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_EMBED_MODEL = 'nomic-embed-text';
const LOCAL_MODEL = 'local-semantic-hash-v1';
const LOCAL_DIMENSIONS = 384;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'using', 'based', 'study', 'paper',
  'research', 'analysis', 'approach', 'method', 'methods', 'system', 'systems', 'model', 'models',
  'their', 'there', 'where', 'which', 'while', 'over', 'under', 'within', 'without', 'also', 'have',
  'has', 'had', 'were', 'was', 'are', 'our', 'new', 'novel', 'towards', 'toward', 'via', 'all',
]);

const CONCEPT_EXPANSIONS = [
  {
    triggers: ['deep learning', 'machine learning', 'artificial intelligence', 'ai'],
    expansions: ['neural network', 'neural networks', 'transformer', 'transformers', 'llm', 'llms', 'data science'],
  },
  {
    triggers: ['convolutional neural network', 'convolutional neural networks', 'cnn', 'cnns'],
    expansions: ['deep learning', 'computer vision', 'image recognition', 'object detection', 'neural network'],
  },
  {
    triggers: ['computer vision', 'image processing', 'visual computing', 'object detection', 'image segmentation'],
    expansions: ['cnn', 'convolutional neural network', 'deep learning', 'image recognition', 'vision transformer'],
  },
  {
    triggers: ['large language model', 'large language models', 'llm', 'llms', 'transformer'],
    expansions: ['natural language processing', 'nlp', 'generative ai', 'language model', 'text generation'],
  },
  {
    triggers: ['natural language processing', 'nlp', 'computational linguistics'],
    expansions: ['language model', 'text mining', 'transformer', 'information retrieval'],
  },
  {
    triggers: ['cybersecurity', 'computer security', 'cryptography', 'network security'],
    expansions: ['security', 'privacy', 'encryption', 'malware', 'threat detection'],
  },
  {
    triggers: ['robotics', 'autonomous', 'drone', 'ros', 'mechatronics'],
    expansions: ['control systems', 'embedded systems', 'sensors', 'actuators', 'iot'],
  },
  {
    triggers: ['startup', 'entrepreneurship', 'venture', 'pitch'],
    expansions: ['business', 'innovation', 'incubator', 'product', 'funding'],
  },
  {
    triggers: ['quant', 'trading', 'stock market', 'finance'],
    expansions: ['investment', 'portfolio', 'economics', 'fintech', 'quantitative finance'],
  },
  {
    triggers: ['ui', 'ux', 'figma', 'design thinking'],
    expansions: ['design', 'prototype', 'user experience', 'interface', 'product design'],
  },
];

let embeddingHealthCache = { checkedAt: 0, available: false };

function embeddingConfig() {
  return {
    provider: (process.env.SEMANTIC_EMBEDDING_PROVIDER || 'auto').toLowerCase(),
    baseUrl: (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    model: process.env.OLLAMA_EMBED_MODEL || DEFAULT_EMBED_MODEL,
    healthTimeoutMs: parseInt(process.env.OLLAMA_HEALTH_TIMEOUT_MS || '800', 10),
    timeoutMs: parseInt(process.env.OLLAMA_EMBED_TIMEOUT_MS || '12000', 10),
  };
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^a-z0-9+#\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsConceptTrigger(normalizedText, trigger) {
  const normalizedTrigger = normalizeText(trigger);
  if (!normalizedTrigger) return false;
  if (!normalizedTrigger.includes(' ') || normalizedTrigger.length <= 3) {
    return new RegExp(`\\b${escapeRegExp(normalizedTrigger)}\\b`, 'i').test(normalizedText);
  }
  return normalizedText.includes(normalizedTrigger);
}

function expandConcepts(text) {
  const lower = normalizeText(text);
  const additions = [];

  for (const concept of CONCEPT_EXPANSIONS) {
    if (concept.triggers.some((trigger) => containsConceptTrigger(lower, trigger))) {
      additions.push(...concept.expansions);
    }
  }

  return additions.length ? `${text} ${additions.join(' ')}` : text;
}

function tokenize(text) {
  const normalized = normalizeText(expandConcepts(text));
  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));

  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]} ${words[i + 1]}`);
  }
  for (let i = 0; i < words.length - 2; i++) {
    tokens.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return tokens;
}

function hashInt(value, salt = '') {
  const digest = crypto.createHash('sha256').update(`${salt}:${value}`).digest();
  return digest.readUInt32BE(0);
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map((value) => value / norm);
}

function localEmbedding(text) {
  const vector = new Array(LOCAL_DIMENSIONS).fill(0);
  const counts = new Map();

  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  for (const [token, count] of counts.entries()) {
    const index = hashInt(token, 'index') % LOCAL_DIMENSIONS;
    const sign = hashInt(token, 'sign') % 2 === 0 ? 1 : -1;
    const phraseBoost = token.includes(' ') ? 1.35 : 1;
    vector[index] += sign * (1 + Math.log(count)) * phraseBoost;
  }

  return {
    vector: normalizeVector(vector),
    provider: 'local',
    model: LOCAL_MODEL,
    dimensions: LOCAL_DIMENSIONS,
  };
}

async function isOllamaEmbeddingAvailable() {
  const cfg = embeddingConfig();
  if (cfg.provider === 'local' || cfg.provider === 'disabled') return false;

  const now = Date.now();
  if (now - embeddingHealthCache.checkedAt < 30000) {
    return embeddingHealthCache.available;
  }

  try {
    await axios.get(`${cfg.baseUrl}/api/tags`, { timeout: cfg.healthTimeoutMs });
    embeddingHealthCache = { checkedAt: now, available: true };
    return true;
  } catch (err) {
    embeddingHealthCache = { checkedAt: now, available: false };
    return false;
  }
}

async function ollamaEmbedding(text) {
  const cfg = embeddingConfig();
  const payload = { model: cfg.model, input: text };

  try {
    const response = await axios.post(`${cfg.baseUrl}/api/embed`, payload, { timeout: cfg.timeoutMs });
    const vector = response.data?.embeddings?.[0];
    if (Array.isArray(vector) && vector.length) {
      return {
        vector: normalizeVector(vector.map(Number)),
        provider: 'ollama',
        model: cfg.model,
        dimensions: vector.length,
      };
    }
  } catch (err) {
    // Older Ollama versions expose /api/embeddings. Try that before falling back.
  }

  const legacyResponse = await axios.post(`${cfg.baseUrl}/api/embeddings`, {
    model: cfg.model,
    prompt: text,
  }, { timeout: cfg.timeoutMs });

  const legacyVector = legacyResponse.data?.embedding;
  if (!Array.isArray(legacyVector) || legacyVector.length === 0) {
    throw new Error('Ollama did not return an embedding vector');
  }

  return {
    vector: normalizeVector(legacyVector.map(Number)),
    provider: 'ollama',
    model: cfg.model,
    dimensions: legacyVector.length,
  };
}

async function computeEmbedding(text) {
  const cfg = embeddingConfig();
  const expanded = expandConcepts(text || '');

  if ((cfg.provider === 'ollama' || cfg.provider === 'auto') && await isOllamaEmbeddingAvailable()) {
    try {
      return await ollamaEmbedding(expanded);
    } catch (err) {
      if (cfg.provider === 'ollama') {
        console.log(`[Semantic] Ollama embedding failed, using local fallback: ${err.message}`);
      }
    }
  }

  return localEmbedding(expanded);
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const size = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < size; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function lexicalOverlapScore(queryText, candidateText) {
  const queryTokens = new Set(tokenize(queryText));
  if (queryTokens.size === 0) return 0;

  const candidateTokens = new Set(tokenize(candidateText));
  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap++;
  }

  return overlap / queryTokens.size;
}

function hybridQueryScore(queryText, candidateText, vectorScore) {
  const overlap = lexicalOverlapScore(queryText, candidateText);
  return (vectorScore * 0.7) + (overlap * 0.3);
}

function preview(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function getStoredEmbedding(entityType, entityId, userId = 0) {
  return pool.raw.prepare(`
    SELECT * FROM semantic_embeddings
    WHERE entity_type = ? AND entity_id = ? AND user_id = ?
  `).get(entityType, entityId, userId);
}

function upsertEmbedding(entityType, entityId, userId, text, embedding, textHash) {
  pool.raw.prepare(`
    INSERT INTO semantic_embeddings (
      entity_type, entity_id, user_id, text_hash, provider, model,
      dimensions, vector_json, source_preview, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(entity_type, entity_id, user_id) DO UPDATE SET
      text_hash = excluded.text_hash,
      provider = excluded.provider,
      model = excluded.model,
      dimensions = excluded.dimensions,
      vector_json = excluded.vector_json,
      source_preview = excluded.source_preview,
      updated_at = datetime('now')
  `).run(
    entityType,
    entityId,
    userId,
    textHash,
    embedding.provider,
    embedding.model,
    embedding.dimensions,
    JSON.stringify(embedding.vector),
    preview(text)
  );
}

async function ensureEmbedding(entityType, entityId, text, userId = 0) {
  const cfg = embeddingConfig();
  const textHash = hashText(expandConcepts(text || ''));
  const stored = getStoredEmbedding(entityType, entityId, userId);
  const providerMatchesConfig =
    cfg.provider === 'auto' ||
    (cfg.provider === 'local' && stored?.provider === 'local') ||
    (cfg.provider === 'ollama' && stored?.provider === 'ollama' && stored?.model === cfg.model);

  if (stored && stored.text_hash === textHash && providerMatchesConfig) {
    try {
      return {
        vector: JSON.parse(stored.vector_json),
        provider: stored.provider,
        model: stored.model,
        dimensions: stored.dimensions,
      };
    } catch (err) {
      // Recompute below.
    }
  }

  const embedding = await computeEmbedding(text || '');
  upsertEmbedding(entityType, entityId, userId, text, embedding, textHash);
  return embedding;
}

function publicationText(row) {
  return [
    row.title,
    row.abstract,
    row.authors,
    row.journal,
    row.domain_name,
    row.professor_name,
    row.department,
  ].filter(Boolean).join(' ');
}

function announcementText(row) {
  return [
    row.title,
    row.content,
    row.club_name,
  ].filter(Boolean).join(' ');
}

function parseInterestTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return String(value).split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}

function getUserProfile(userId) {
  const clubs = pool.raw.prepare(`
    SELECT c.id, c.name, c.description, c.category
    FROM clubs c
    INNER JOIN user_clubs uc ON uc.club_id = c.id
    WHERE uc.user_id = ?
  `).all(userId);

  const domains = pool.raw.prepare(`
    SELECT d.id, d.name, d.description
    FROM domains d
    INNER JOIN user_domains ud ON ud.domain_id = d.id
    WHERE ud.user_id = ?
  `).all(userId);

  const emailTags = pool.raw.prepare(`
    SELECT interest_tags
    FROM gmail_emails
    WHERE user_id = ? AND interest_tags IS NOT NULL
    ORDER BY received_at DESC
    LIMIT 25
  `).all(userId)
    .flatMap((row) => parseInterestTags(row.interest_tags));

  const text = [
    ...clubs.flatMap((club) => [club.name, club.description, club.category]),
    ...domains.flatMap((domain) => [domain.name, domain.description]),
    ...emailTags,
  ].filter(Boolean).join(' ');

  return {
    text,
    preferredClubIds: clubs.map((club) => club.id),
    preferredDomainIds: domains.map((domain) => domain.id),
  };
}

async function userEmbedding(userId, profile) {
  const text = profile?.text || getUserProfile(userId).text;
  if (!text.trim()) return null;
  return ensureEmbedding('user_profile', userId, text, userId);
}

function roundScore(score) {
  return Math.round(Math.max(0, Math.min(score, 1)) * 1000) / 1000;
}

async function rankPublicationsForUser(userId, limit = 50) {
  const profile = getUserProfile(userId);
  if (!profile.text.trim()) {
    return pool.raw.prepare(`
      SELECT p.*, pr.name as professor_name, pr.department, d.name as domain_name
      FROM publications p
      LEFT JOIN professors pr ON p.professor_id = pr.id
      LEFT JOIN domains d ON p.domain_id = d.id
      ORDER BY p.publication_year DESC, p.citation_count DESC
      LIMIT ?
    `).all(limit);
  }

  const userVector = await userEmbedding(userId, profile);
  const rows = pool.raw.prepare(`
    SELECT p.*, pr.name as professor_name, pr.department, d.name as domain_name
    FROM publications p
    LEFT JOIN professors pr ON p.professor_id = pr.id
    LEFT JOIN domains d ON p.domain_id = d.id
  `).all();

  const ranked = [];
  for (const row of rows) {
    const embedding = await ensureEmbedding('publication', row.id, publicationText(row));
    const semantic = cosineSimilarity(userVector.vector, embedding.vector);
    const preferenceBoost = profile.preferredDomainIds.includes(row.domain_id) ? 0.15 : 0;
    ranked.push({
      ...row,
      semantic_score: roundScore((semantic * 0.85) + preferenceBoost),
      match_reason: preferenceBoost ? 'preferred domain + semantic similarity' : 'semantic similarity',
    });
  }

  return ranked
    .sort((a, b) => b.semantic_score - a.semantic_score || (b.citation_count || 0) - (a.citation_count || 0))
    .slice(0, limit);
}

async function rankAnnouncementsForUser(userId, limit = 50) {
  const profile = getUserProfile(userId);
  if (!profile.text.trim()) {
    return pool.raw.prepare(`
      SELECT a.*, c.name as club_name
      FROM announcements a
      LEFT JOIN clubs c ON a.club_id = c.id
      ORDER BY a.published_at DESC
      LIMIT ?
    `).all(limit);
  }

  const userVector = await userEmbedding(userId, profile);
  const rows = pool.raw.prepare(`
    SELECT a.*, c.name as club_name
    FROM announcements a
    LEFT JOIN clubs c ON a.club_id = c.id
  `).all();

  const ranked = [];
  for (const row of rows) {
    const embedding = await ensureEmbedding('announcement', row.id, announcementText(row));
    const semantic = cosineSimilarity(userVector.vector, embedding.vector);
    const preferenceBoost = profile.preferredClubIds.includes(row.club_id) ? 0.2 : 0;
    ranked.push({
      ...row,
      semantic_score: roundScore((semantic * 0.8) + preferenceBoost),
      match_reason: preferenceBoost ? 'preferred club + semantic similarity' : 'semantic similarity',
    });
  }

  return ranked
    .sort((a, b) => b.semantic_score - a.semantic_score || String(b.published_at || '').localeCompare(String(a.published_at || '')))
    .slice(0, limit);
}

async function semanticRankRows(rows, query, entityType, textBuilder, options = {}) {
  const queryEmbedding = await computeEmbedding(query || '');
  const ranked = [];

  for (const row of rows) {
    const id = row.id;
    const candidateText = textBuilder(row);
    const embedding = await ensureEmbedding(entityType, id, candidateText);
    const score = cosineSimilarity(queryEmbedding.vector, embedding.vector);
    const hybridScore = hybridQueryScore(query, candidateText, score);
    if (hybridScore >= (options.minScore ?? -1)) {
      ranked.push({
        ...row,
        semantic_score: roundScore(hybridScore),
        match_reason: 'semantic query similarity',
      });
    }
  }

  return ranked.sort((a, b) => b.semantic_score - a.semantic_score);
}

async function indexPublication(publicationId) {
  const row = pool.raw.prepare(`
    SELECT p.*, pr.name as professor_name, pr.department, d.name as domain_name
    FROM publications p
    LEFT JOIN professors pr ON p.professor_id = pr.id
    LEFT JOIN domains d ON p.domain_id = d.id
    WHERE p.id = ?
  `).get(publicationId);
  if (!row) return null;
  return ensureEmbedding('publication', row.id, publicationText(row));
}

async function indexAnnouncement(announcementId) {
  const row = pool.raw.prepare(`
    SELECT a.*, c.name as club_name
    FROM announcements a
    LEFT JOIN clubs c ON a.club_id = c.id
    WHERE a.id = ?
  `).get(announcementId);
  if (!row) return null;
  return ensureEmbedding('announcement', row.id, announcementText(row));
}

module.exports = {
  computeEmbedding,
  ensureEmbedding,
  cosineSimilarity,
  publicationText,
  announcementText,
  semanticRankRows,
  rankPublicationsForUser,
  rankAnnouncementsForUser,
  indexPublication,
  indexAnnouncement,
  getUserProfile,
};
