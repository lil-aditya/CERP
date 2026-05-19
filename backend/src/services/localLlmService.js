const axios = require('axios');
const { buildLlmSafeEmailText } = require('./privacyEngine');

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_LLM_MODEL = 'llama3.1:8b';

const TAG_KEYWORDS = {
  ai: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'llm', 'transformer', 'neural network'],
  'computer vision': ['computer vision', 'image recognition', 'object detection', 'cnn', 'convolutional'],
  nlp: ['natural language', 'nlp', 'language model', 'text mining'],
  research: ['research', 'paper', 'publication', 'conference', 'journal', 'symposium'],
  robotics: ['robot', 'robotics', 'drone', 'arduino', 'embedded', 'sensor'],
  programming: ['programming', 'coding', 'hackathon', 'software', 'developer', 'github'],
  design: ['design', 'ui', 'ux', 'figma', 'prototype'],
  entrepreneurship: ['startup', 'entrepreneur', 'pitch', 'venture', 'business'],
  finance: ['finance', 'trading', 'stock', 'investment', 'market'],
  sports: ['cricket', 'football', 'basketball', 'badminton', 'tournament', 'sports'],
  culture: ['music', 'dance', 'theatre', 'drama', 'poetry', 'cultural'],
  academic: ['exam', 'assignment', 'semester', 'course', 'lecture', 'deadline', 'registration'],
  event: ['workshop', 'seminar', 'webinar', 'meetup', 'session', 'competition', 'event'],
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'from', 'this', 'that', 'are', 'our', 'will', 'all',
  'can', 'has', 'have', 'was', 'were', 'been', 'into', 'about', 'there', 'their', 'please', 'join',
  'redacted', 'name', 'email', 'phone', 'id', 'grade', 'iitj', 'iit', 'jodhpur',
]);

let healthCache = { checkedAt: 0, available: false };

function config() {
  return {
    mode: (process.env.EMAIL_DIGEST_MODE || 'auto').toLowerCase(),
    baseUrl: (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    model: process.env.OLLAMA_LLM_MODEL || DEFAULT_LLM_MODEL,
    healthTimeoutMs: parseInt(process.env.OLLAMA_HEALTH_TIMEOUT_MS || '800', 10),
    generationTimeoutMs: parseInt(process.env.OLLAMA_GENERATION_TIMEOUT_MS || '20000', 10),
  };
}

function sanitizeTags(tags) {
  const values = Array.isArray(tags) ? tags : [];
  const cleaned = [];
  for (const tag of values) {
    const normalized = String(tag || '')
      .toLowerCase()
      .replace(/[^a-z0-9+\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized && normalized.length <= 32 && !cleaned.includes(normalized)) {
      cleaned.push(normalized);
    }
    if (cleaned.length >= 6) break;
  }
  return cleaned;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^a-z0-9+\-\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function extractTags(text) {
  const lower = String(text || '').toLowerCase();
  const tags = [];

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      tags.push(tag);
    }
    if (tags.length >= 6) return tags;
  }

  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [
    ...tags,
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([token]) => token)
      .filter((token) => !tags.includes(token))
      .slice(0, 6 - tags.length),
  ];
}

function trimSentence(sentence, maxLength = 220) {
  const cleaned = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 3).trim()}...`;
}

function extractiveDigest(email, status = 'extractive') {
  const safeText = buildLlmSafeEmailText(email, 3500);
  const body = email.sanitized_body_text || email.body_text || email.sanitized_snippet || email.snippet || '';
  const sentences = String(body)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24 && !/^\[[^\]]+\]$/.test(sentence));

  const subject = email.sanitized_subject || email.subject || '';
  const firstSentence = sentences[0] || email.sanitized_snippet || email.snippet || body || subject;
  const summary = trimSentence(subject && firstSentence && !firstSentence.includes(subject)
    ? `${subject}: ${firstSentence}`
    : firstSentence || subject || 'No digest available.');

  return {
    summary,
    tags: extractTags(safeText),
    action_items: [],
    status,
    model: 'local-extractive',
  };
}

async function isOllamaAvailable() {
  const cfg = config();
  if (cfg.mode === 'disabled' || cfg.mode === 'extractive') return false;

  const now = Date.now();
  if (now - healthCache.checkedAt < 30000) {
    return healthCache.available;
  }

  try {
    await axios.get(`${cfg.baseUrl}/api/tags`, { timeout: cfg.healthTimeoutMs });
    healthCache = { checkedAt: now, available: true };
    return true;
  } catch (err) {
    healthCache = { checkedAt: now, available: false };
    return false;
  }
}

function parseJsonResponse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  const text = String(value).trim();
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (innerErr) {
      return null;
    }
  }
}

async function generateWithOllama(email) {
  const cfg = config();
  const safeText = buildLlmSafeEmailText(email);
  const prompt = [
    'You are a local privacy-preserving email digest model.',
    'The input has already been anonymized. Do not infer or restore redacted PII.',
    'Return compact JSON only with keys: summary, interest_tags, action_items.',
    'summary must be <= 35 words. interest_tags must be 3 to 6 lowercase academic/club interest tags.',
    '',
    safeText,
  ].join('\n');

  const response = await axios.post(`${cfg.baseUrl}/api/generate`, {
    model: cfg.model,
    prompt,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.1,
      num_predict: 180,
    },
  }, { timeout: cfg.generationTimeoutMs });

  const parsed = parseJsonResponse(response.data?.response);
  if (!parsed) throw new Error('Ollama returned non-JSON digest');

  const summary = trimSentence(parsed.summary || parsed.digest || '', 260);
  const tags = sanitizeTags(parsed.interest_tags || parsed.tags);
  const actionItems = Array.isArray(parsed.action_items)
    ? parsed.action_items.map((item) => trimSentence(item, 120)).slice(0, 3)
    : [];

  return {
    summary: summary || extractiveDigest(email).summary,
    tags: tags.length ? tags : extractTags(safeText),
    action_items: actionItems,
    status: 'ollama',
    model: cfg.model,
  };
}

async function generateEmailDigest(email, options = {}) {
  const allowOllama = options.allowOllama !== false;
  const cfg = config();

  if (!allowOllama) {
    return extractiveDigest(email, 'extractive_batch_limit');
  }

  if (cfg.mode === 'extractive' || cfg.mode === 'disabled') {
    return extractiveDigest(email, cfg.mode);
  }

  if (await isOllamaAvailable()) {
    try {
      return await generateWithOllama(email);
    } catch (err) {
      return extractiveDigest(email, `ollama_error:${err.message.slice(0, 80)}`);
    }
  }

  return extractiveDigest(email, 'ollama_unavailable_fallback');
}

module.exports = {
  generateEmailDigest,
  extractiveDigest,
  isOllamaAvailable,
};
