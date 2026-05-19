const crypto = require('crypto');

let compromise = null;
try {
  // Optional NER boost. The app keeps working when this dependency is absent.
  compromise = require('compromise');
} catch (err) {
  compromise = null;
}

const REDACTION_TOKENS = {
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
  id: '[REDACTED_ID]',
  grade: '[REDACTED_GRADE]',
  name: '[REDACTED_NAME]',
};

const NON_PERSON_PHRASES = new Set([
  'IIT Jodhpur',
  'Indian Institute',
  'Google Developer',
  'Open Source',
  'Machine Learning',
  'Deep Learning',
  'Artificial Intelligence',
  'Computer Vision',
  'Data Science',
  'Sports Council',
  'Research Symposium',
]);

function sha256(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function senderDomain(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@').pop().toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function increment(counts, key, by = 1) {
  counts[key] = (counts[key] || 0) + by;
}

function replaceWithCount(text, pattern, token, counts, key, validator = null) {
  return text.replace(pattern, (match) => {
    if (validator && !validator(match)) return match;
    increment(counts, key);
    return token;
  });
}

function cleanNameHint(value) {
  const cleaned = normalizeWhitespace(String(value || '')
    .replace(/["'<>]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, ' '));

  if (!cleaned) return null;
  if (cleaned.length < 3 || cleaned.length > 80) return null;
  if (/^\[REDACTED_/.test(cleaned)) return null;
  if (NON_PERSON_PHRASES.has(cleaned)) return null;
  if (!/[A-Za-z]/.test(cleaned)) return null;
  return cleaned;
}

function collectContextNames(text, nameHints = []) {
  const candidates = new Set();

  for (const hint of nameHints) {
    const cleaned = cleanNameHint(hint);
    if (cleaned) candidates.add(cleaned);
  }

  if (compromise) {
    try {
      const people = compromise(text).people().out('array') || [];
      for (const person of people) {
        const cleaned = cleanNameHint(person);
        if (cleaned) candidates.add(cleaned);
      }
    } catch (err) {
      // Optional NER should never make sync fail.
    }
  }

  const contextualPatterns = [
    /\b(?:dear|hi|hello|regards|thanks|thank you|from|name)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g,
    /\b(?:Dr|Prof|Professor|Mr|Ms|Mrs)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g,
    /\b(?:student|candidate|applicant)\s+name\s*[:=-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g,
  ];

  for (const pattern of contextualPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const cleaned = cleanNameHint(match[1]);
      if (cleaned) candidates.add(cleaned);
    }
  }

  return [...candidates]
    .filter((name) => !NON_PERSON_PHRASES.has(name))
    .sort((a, b) => b.length - a.length);
}

function redactNames(text, names, counts) {
  let redacted = text;
  for (const name of names) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;

    const phrasePattern = new RegExp(`\\b${parts.map(escapeRegExp).join('\\s+')}\\b`, 'gi');
    redacted = replaceWithCount(redacted, phrasePattern, REDACTION_TOKENS.name, counts, 'names');

    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      if (lastName.length > 3) {
        const titlePattern = new RegExp(`\\b(?:Dr|Prof|Professor|Mr|Ms|Mrs)\\.?\\s+${escapeRegExp(lastName)}\\b`, 'gi');
        redacted = replaceWithCount(redacted, titlePattern, REDACTION_TOKENS.name, counts, 'names');
      }
    }
  }
  return redacted;
}

function anonymizeText(text, options = {}) {
  const original = String(text || '');
  if (!original) {
    return {
      text: '',
      counts: {},
      engine: compromise ? 'regex+optional-compromise' : 'regex-contextual',
      names: [],
    };
  }

  const counts = {};
  const names = collectContextNames(original, options.nameHints || []);
  let redacted = original;

  redacted = replaceWithCount(
    redacted,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    REDACTION_TOKENS.email,
    counts,
    'emails'
  );

  redacted = replaceWithCount(
    redacted,
    /(?:\+?\d[\d\s().-]{8,}\d)/g,
    REDACTION_TOKENS.phone,
    counts,
    'phones',
    (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    }
  );

  redacted = replaceWithCount(
    redacted,
    /\b(?:[A-Z]{1,4}\d{2}[A-Z]{0,3}\d{3,6}|\d{2}[A-Z]{2,4}\d{3,6})\b/g,
    REDACTION_TOKENS.id,
    counts,
    'ids'
  );

  const gradePatterns = [
    /\b(?:cgpa|sgpa|gpa)\s*(?:is|:|=|-)?\s*\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*10)?\b/gi,
    /\b(?:grade)\s*(?:is|:|=|-)?\s*[A-F][+-]?\b/gi,
    /\b(?:marks?|score|percentage)\s*(?:is|:|=|-)?\s*\d{1,3}(?:\.\d+)?\s*(?:\/\s*100|%)?\b/gi,
  ];
  for (const pattern of gradePatterns) {
    redacted = replaceWithCount(redacted, pattern, REDACTION_TOKENS.grade, counts, 'grades');
  }

  redacted = redactNames(redacted, names, counts);

  return {
    text: redacted.replace(/\](?=[A-Za-z])/g, '] ').replace(/[ \t]+/g, ' ').trim(),
    counts,
    engine: compromise ? 'regex+optional-compromise' : 'regex-contextual',
    names,
  };
}

function mergeCounts(...countObjects) {
  const merged = {};
  for (const counts of countObjects) {
    for (const [key, value] of Object.entries(counts || {})) {
      increment(merged, key, value);
    }
  }
  return merged;
}

function buildPrivacyReport(results, rawEmail = {}) {
  const counts = mergeCounts(results.subject.counts, results.snippet.counts, results.body.counts);
  const redactedTypes = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([key]) => key);

  return {
    engine: results.body.engine,
    redacted_types: redactedTypes,
    counts,
    raw_body_retained: false,
    sender_domain: senderDomain(rawEmail.from_email),
    from_email_hash: sha256(rawEmail.from_email),
    anonymized_at: new Date().toISOString(),
  };
}

function anonymizeEmail(email) {
  const nameHints = [email.from_name];
  const combinedText = `${email.subject || ''}\n${email.snippet || ''}\n${email.body_text || ''}`;
  const discoveredNames = collectContextNames(combinedText, nameHints);
  const hints = [...new Set([...nameHints, ...discoveredNames].filter(Boolean))];

  const subject = anonymizeText(email.subject || '', { nameHints: hints });
  const snippet = anonymizeText(email.snippet || '', { nameHints: hints });
  const body = anonymizeText(email.body_text || '', { nameHints: hints });
  const report = buildPrivacyReport({ subject, snippet, body }, email);

  const safeSubject = subject.text || '(No subject)';
  const safeSnippet = snippet.text || '';
  const safeBody = body.text || safeSnippet;

  return {
    ...email,
    from_name: email.from_name ? REDACTION_TOKENS.name : '',
    subject: safeSubject,
    snippet: safeSnippet,
    body_text: safeBody,
    sanitized_subject: safeSubject,
    sanitized_snippet: safeSnippet,
    sanitized_body_text: safeBody,
    sender_domain: report.sender_domain,
    from_email_hash: report.from_email_hash,
    privacy_report: JSON.stringify(report),
    anonymized_at: report.anonymized_at,
  };
}

function buildLlmSafeEmailText(email, maxChars = 6000) {
  return [
    `Subject: ${email.sanitized_subject || email.subject || ''}`,
    `Snippet: ${email.sanitized_snippet || email.snippet || ''}`,
    `Body: ${email.sanitized_body_text || email.body_text || ''}`,
  ]
    .join('\n')
    .slice(0, maxChars);
}

module.exports = {
  REDACTION_TOKENS,
  anonymizeText,
  anonymizeEmail,
  buildLlmSafeEmailText,
  sha256,
  senderDomain,
};
