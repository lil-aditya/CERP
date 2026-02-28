/**
 * Smart Email Categorizer — NLP-powered email classification
 * 
 * Uses TF-IDF, cosine similarity, fuzzy matching, stemming, and n-grams
 * to accurately categorize emails to clubs/categories.
 * 
 * Much more accurate than simple keyword matching because:
 * 1. TF-IDF captures term importance (common words like "the" are down-weighted)
 * 2. Stemming normalizes words ("programming" → "program", "coded" → "code")
 * 3. Fuzzy matching catches typos and abbreviations
 * 4. N-grams capture phrase context (bigrams like "machine learning")
 * 5. Synonym expansion broadens each club's keyword profile
 * 6. Multi-signal scoring combines sender, TF-IDF, fuzzy, keyword matches
 */

const natural = require('natural');
const pool = require('../db/pool');

// NLP tools from 'natural'
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const JaroWinklerDistance = natural.JaroWinklerDistance;

// ─── Synonym / related-term expansion per category ───
// This massively improves recall — even if email says "ML workshop", 
// it still matches AI Club because "ml" is a synonym for "artificial intelligence"
const SYNONYM_MAP = {
  'programming': ['coding', 'code', 'developer', 'dev', 'software', 'algorithm', 'dsa', 'data structure', 'competitive', 'codeforces', 'leetcode', 'hackerrank', 'github', 'open source', 'hackathon', 'cp', 'web dev', 'app dev', 'backend', 'frontend', 'fullstack', 'python', 'javascript', 'java', 'c++', 'rust', 'golang', 'pclub', 'insomniac', 'devfest'],
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'dl', 'neural network', 'nlp', 'natural language', 'computer vision', 'cv', 'transformer', 'gpt', 'llm', 'data science', 'tensorflow', 'pytorch', 'kaggle', 'model training', 'reinforcement learning', 'raid'],
  'robotics': ['robot', 'drone', 'autonomous', 'arduino', 'raspberry pi', 'ros', 'embedded', 'iot', 'internet of things', 'sensor', 'actuator', 'microcontroller', 'pcb', 'mechatronics', 'control system', '3d printing', 'robowar'],
  'sangam': ['singing', 'band', 'concert', 'melody', 'rhythm', 'guitar', 'drums', 'vocals', 'performance', 'musical', 'jam session', 'battle of bands', 'acoustic', 'unplugged', 'orchestra', 'open mic', 'music night'],
  'drama': ['theatre', 'theater', 'acting', 'play', 'skit', 'nukkad', 'street play', 'monologue', 'stage', 'rehearsal', 'audition', 'mime', 'improv', 'dramatics', 'dramebaaz'],
  'literary': ['debate', 'creative writing', 'poetry', 'poem', 'essay', 'literature', 'book club', 'reading', 'oratory', 'elocution', 'extempore', 'storytelling', 'spoken word', 'litsoc'],
  'sports': ['cricket', 'football', 'basketball', 'volleyball', 'tennis', 'badminton', 'athletics', 'swimming', 'hockey', 'kabaddi', 'chess', 'tournament', 'match', 'tryout', 'trial', 'inter-iit', 'spardha', 'fitness', 'gym', 'marathon', 'run', 'squash', 'weightlifting', 'esports'],
  'photography': ['photo', 'camera', 'lens', 'portrait', 'landscape', 'editing', 'lightroom', 'photoshop', 'exhibition', 'gallery', 'click', 'shoot', 'dslr', 'mirrorless', 'videography', 'film', 'framex', 'photowalk', 'short film', 'filmmaking'],
  'entrepreneurship': ['startup', 'entrepreneur', 'business', 'pitch', 'investor', 'venture', 'incubator', 'accelerator', 'e-summit', 'innovation', 'product', 'market', 'funding', 'seed', 'ideation', 'lean', 'mvp', 'e-cell', 'ecell'],
  'finance': ['trading', 'stock', 'market', 'investment', 'portfolio', 'mutual fund', 'cryptocurrency', 'crypto', 'blockchain', 'fintech', 'economics', 'banking', 'bull', 'bear', 'equity', 'derivative', 'forex', 'quant'],
  'design': ['ui', 'ux', 'user interface', 'user experience', 'figma', 'sketch', 'adobe', 'illustrator', 'graphic', 'branding', 'logo', 'typography', 'wireframe', 'prototype', 'canva', 'design thinking', 'color theory', 'designerds'],
  'astronomy': ['star', 'planet', 'telescope', 'stargazing', 'constellation', 'galaxy', 'cosmos', 'space', 'nasa', 'isro', 'astrophysics', 'observatory', 'eclipse', 'meteor', 'comet', 'night sky', 'celestial', 'nexus'],
  'gdsc': ['google developer', 'flutter', 'firebase', 'google cloud', 'android', 'kotlin', 'angular', 'gdsc'],
  'devlup': ['devlup labs', 'open source project', 'contributor', 'pull request'],
  'boltheads': ['electronics', 'circuit', 'soldering', 'pcb design', 'hardware', 'embedded', 'boltheads'],
  'quiz': ['quiz', 'trivia', 'general knowledge', 'quizzing', 'quiz society'],
  'pheme': ['public speaking', 'oratory', 'mun', 'model united nations', 'elocution', 'pheme'],
  'ateliers': ['sketch', 'painting', 'art walk', 'watercolor', 'canvas', 'drawing', 'visual art', 'ateliers'],
  'raw': ['music production', 'audio engineering', 'sound design', 'mixing', 'mastering', 'beat', 'raw music'],
  'groovetheory': ['dance', 'hip hop', 'choreography', 'classical dance', 'contemporary', 'freestyle', 'groove theory'],
  'inside': ['journalism', 'campus news', 'newsletter', 'media', 'reporting', 'inside iitj'],
  'academic': ['exam', 'grade', 'semester', 'registration', 'gpa', 'cgpa', 'credit', 'syllabus', 'timetable', 'assignment', 'lab', 'lecture', 'tutorial', 'attendance', 'deadline', 'course', 'department', 'faculty', 'dean', 'registrar'],
  'research': ['paper', 'publication', 'journal', 'conference', 'thesis', 'dissertation', 'phd', 'scholar', 'ieee', 'acm', 'springer', 'elsevier', 'arxiv', 'peer review', 'citation', 'abstract', 'methodology', 'literature review'],
};

// Map club names (lowercase) to their synonym group key
const CLUB_SYNONYM_KEYS = {
  'pclub': 'programming',
  'raid': 'ai',
  'robotics society': 'robotics',
  'sangam': 'sangam',
  'dramebaaz': 'drama',
  'litsoc': 'literary',
  'sports council': 'sports',
  'framex': 'photography',
  'e-cell': 'entrepreneurship',
  'quant club': 'finance',
  'designerds': 'design',
  'nexus': 'astronomy',
  'gdsc iit jodhpur': 'gdsc',
  'devlup labs': 'devlup',
  'boltheads': 'boltheads',
  'quiz society': 'quiz',
  'pheme': 'pheme',
  'ateliers': 'ateliers',
  'raw': 'raw',
  'the groove theory': 'groovetheory',
  'inside': 'inside',
  'cricket society': 'sports',
  'basketball society': 'sports',
  'football society': 'sports',
  'badminton society': 'sports',
  'hockey society': 'sports',
  'chess society': 'sports',
  'volleyball society': 'sports',
  'lawn tennis society': 'sports',
  'table tennis society': 'sports',
  'athletic society': 'sports',
  'kabaddi society': 'sports',
  'squash society': 'sports',
  'e-sports society': 'sports',
  'weightlifting society': 'sports',
  'self defence club': 'sports',
};

// ─── Text preprocessing ───
function preprocessText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/\+\#]/g, ' ')  // keep alphanum + some special chars
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const processed = preprocessText(text);
  return tokenizer.tokenize(processed) || [];
}

function stemTokens(tokens) {
  return tokens.map(t => stemmer.stem(t));
}

// Generate bigrams from tokens
function getBigrams(tokens) {
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

// ─── Build club profiles (TF-IDF documents) ───
function buildClubProfiles() {
  const db = pool.raw;

  // Get all clubs
  const clubs = db.prepare('SELECT * FROM clubs').all();

  // Get all match rules
  const rules = db.prepare(`
    SELECT emr.*, c.name as club_name 
    FROM email_match_rules emr 
    LEFT JOIN clubs c ON emr.club_id = c.id
  `).all();

  const profiles = [];

  for (const club of clubs) {
    const clubRules = rules.filter(r => r.club_id === club.id);
    const senderPatterns = clubRules.filter(r => r.rule_type === 'sender').map(r => r.pattern);
    const keywordPatterns = clubRules.filter(r => r.rule_type === 'keyword').map(r => r.pattern);

    // Build a rich text profile for this club
    const profileParts = [
      club.name,
      club.name, // repeat club name for emphasis
      club.description || '',
      ...keywordPatterns,
      ...keywordPatterns, // repeat keywords for emphasis
    ];

    // Add synonyms
    const clubKey = CLUB_SYNONYM_KEYS[club.name.toLowerCase()];
    if (clubKey && SYNONYM_MAP[clubKey]) {
      profileParts.push(...SYNONYM_MAP[clubKey]);
    }

    profiles.push({
      club_id: club.id,
      club_name: club.name,
      senders: senderPatterns.map(s => s.toLowerCase()),
      keywords: keywordPatterns.map(k => k.toLowerCase()),
      synonymKey: clubKey,
      profileText: profileParts.join(' ').toLowerCase(),
    });
  }

  // Add special categories (not tied to a specific club)
  profiles.push({
    club_id: null,
    club_name: 'Academic',
    senders: rules.filter(r => !r.club_id && r.rule_type === 'sender').map(r => r.pattern.toLowerCase()),
    keywords: [...(SYNONYM_MAP['academic'] || [])],
    synonymKey: 'academic',
    profileText: SYNONYM_MAP['academic']?.join(' ') || '',
  });

  profiles.push({
    club_id: null,
    club_name: 'Research',
    senders: [],
    keywords: [...(SYNONYM_MAP['research'] || [])],
    synonymKey: 'research',
    profileText: SYNONYM_MAP['research']?.join(' ') || '',
  });

  return profiles;
}

// ─── TF-IDF based scoring ───
function computeTfIdfScores(emailText, clubProfiles) {
  const tfidf = new TfIdf();

  // Add each club profile as a document
  for (const profile of clubProfiles) {
    tfidf.addDocument(profile.profileText);
  }

  // Add the email as the last document
  tfidf.addDocument(emailText);

  // For each club, compute how similar the email is to the club profile
  // We do this by checking how the email's key terms score in each club document
  const emailTokens = tokenize(emailText);
  const emailStems = [...new Set(stemTokens(emailTokens))]; // unique stems

  const scores = clubProfiles.map((profile, idx) => {
    let score = 0;
    let matchedTerms = 0;

    // Check each unique stem from the email against the club's TF-IDF
    for (const stem of emailStems) {
      const tfidfValue = tfidf.tfidf(stem, idx);
      if (tfidfValue > 0) {
        score += tfidfValue;
        matchedTerms++;
      }
    }

    // Normalize by number of email stems to avoid length bias
    const normalizedScore = emailStems.length > 0 ? score / emailStems.length : 0;

    return {
      club_id: profile.club_id,
      club_name: profile.club_name,
      tfidfScore: normalizedScore,
      matchedTerms,
    };
  });

  return scores;
}

// ─── Fuzzy matching score ───
function computeFuzzyScores(emailText, clubProfiles) {
  const emailTokens = tokenize(emailText);
  const emailBigrams = getBigrams(emailTokens);

  return clubProfiles.map(profile => {
    let maxFuzzyScore = 0;
    let fuzzyMatches = 0;

    // Check each email token against club keywords + synonyms
    const allKeywords = [
      ...profile.keywords,
      ...(profile.synonymKey && SYNONYM_MAP[profile.synonymKey] ? SYNONYM_MAP[profile.synonymKey] : []),
    ];

    for (const emailToken of emailTokens) {
      for (const keyword of allKeywords) {
        const kwTokens = tokenize(keyword);
        for (const kwToken of kwTokens) {
          const dist = JaroWinklerDistance(emailToken, kwToken);
          if (dist > 0.85) { // High threshold for fuzzy match
            maxFuzzyScore = Math.max(maxFuzzyScore, dist);
            fuzzyMatches++;
          }
        }
      }
    }

    // Also check bigrams against multi-word keywords
    for (const bigram of emailBigrams) {
      for (const keyword of allKeywords) {
        if (keyword.includes(' ')) { // multi-word keywords
          const dist = JaroWinklerDistance(bigram, keyword);
          if (dist > 0.85) {
            maxFuzzyScore = Math.max(maxFuzzyScore, dist);
            fuzzyMatches += 2; // bigram matches count double
          }
        }
      }
    }

    return {
      club_id: profile.club_id,
      club_name: profile.club_name,
      fuzzyScore: maxFuzzyScore,
      fuzzyMatches,
    };
  });
}

// ─── Sender matching score (exact or partial) ───
function computeSenderScore(fromEmail, clubProfiles) {
  return clubProfiles.map(profile => {
    let senderScore = 0;

    for (const senderPattern of profile.senders) {
      if (fromEmail === senderPattern) {
        senderScore = 1.0; // exact match
        break;
      } else if (fromEmail.includes(senderPattern) || senderPattern.includes(fromEmail.split('@')[0])) {
        senderScore = Math.max(senderScore, 0.8); // partial match
      } else {
        // Fuzzy match on sender
        const dist = JaroWinklerDistance(fromEmail.split('@')[0], senderPattern.split('@')[0]);
        if (dist > 0.85) {
          senderScore = Math.max(senderScore, dist * 0.7);
        }
      }
    }

    return {
      club_id: profile.club_id,
      club_name: profile.club_name,
      senderScore,
    };
  });
}

// ─── Direct keyword hit count (stemmed) ───
function computeKeywordHits(emailText, clubProfiles) {
  const emailStems = stemTokens(tokenize(emailText));
  const emailStemSet = new Set(emailStems);

  return clubProfiles.map(profile => {
    const allKeywords = [
      ...profile.keywords,
      ...(profile.synonymKey && SYNONYM_MAP[profile.synonymKey] ? SYNONYM_MAP[profile.synonymKey] : []),
    ];

    let hits = 0;
    let uniqueHits = new Set();

    for (const keyword of allKeywords) {
      const kwStems = stemTokens(tokenize(keyword));
      let allMatch = kwStems.length > 0;
      for (const kwStem of kwStems) {
        if (!emailStemSet.has(kwStem)) {
          allMatch = false;
          break;
        }
      }
      if (allMatch && kwStems.length > 0) {
        hits++;
        kwStems.forEach(s => uniqueHits.add(s));
      }
    }

    return {
      club_id: profile.club_id,
      club_name: profile.club_name,
      keywordHits: hits,
      uniqueTermHits: uniqueHits.size,
    };
  });
}

// ─── Event detection (much better than simple regex) ───
function detectEvent(text) {
  const lower = preprocessText(text);

  const datePatterns = [
    /\b\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*,?\s*\d{2,4}/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{2,4}/i,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
  ];

  const timePatterns = [
    /\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)?\b/,
    /\b\d{1,2}\s*(am|pm|AM|PM)\b/,
    /\b(morning|afternoon|evening|night)\s+session\b/i,
  ];

  const eventKeywords = [
    'register', 'registration', 'rsvp', 'sign up', 'signup',
    'venue', 'location', 'auditorium', 'seminar hall', 'lecture hall',
    'deadline', 'last date', 'due date',
    'workshop', 'webinar', 'seminar', 'hackathon', 'fest',
    'competition', 'contest', 'championship', 'tournament',
    'meetup', 'meet up', 'gathering', 'session',
    'talk', 'guest lecture', 'guest speaker', 'keynote',
    'invitation', 'invited', 'cordially', 'join us',
    'schedule', 'agenda', 'itinerary',
  ];

  let eventScore = 0;
  const signals = [];

  // Check date patterns
  for (const pattern of datePatterns) {
    if (pattern.test(lower)) {
      eventScore += 0.3;
      signals.push('date');
      break;
    }
  }

  // Check time patterns
  for (const pattern of timePatterns) {
    if (pattern.test(lower)) {
      eventScore += 0.2;
      signals.push('time');
      break;
    }
  }

  // Check event keywords
  let kwCount = 0;
  for (const kw of eventKeywords) {
    if (lower.includes(kw)) {
      kwCount++;
      if (kwCount <= 3) eventScore += 0.15;
    }
  }
  if (kwCount > 0) signals.push(`keywords(${kwCount})`);

  return {
    isEvent: eventScore >= 0.3,
    eventScore: Math.min(eventScore, 1.0),
    signals,
  };
}

// ─── Combined scoring: merge all signals into final category ───
// Weights for each signal type
const WEIGHTS = {
  sender: 0.35,      // Sender match is the strongest single signal
  tfidf: 0.25,       // TF-IDF semantic similarity
  keyword: 0.25,     // Direct keyword/synonym stemmed hit
  fuzzy: 0.15,       // Fuzzy matching for typos/abbreviations
};

function categorizeEmail(email, clubProfiles, userClubIds = []) {
  const emailText = `${email.subject || ''} ${email.snippet || ''} ${email.body_text || ''} ${email.from_name || ''}`;
  const fromEmail = (email.from_email || '').toLowerCase();

  // Compute all signals
  const senderScores = computeSenderScore(fromEmail, clubProfiles);
  const tfidfScores = computeTfIdfScores(emailText, clubProfiles);
  const fuzzyScores = computeFuzzyScores(emailText, clubProfiles);
  const keywordHits = computeKeywordHits(emailText, clubProfiles);

  // Normalize TF-IDF scores to 0-1
  const maxTfidf = Math.max(...tfidfScores.map(s => s.tfidfScore), 0.001);

  // Combine into final score per club
  const combined = clubProfiles.map((profile, idx) => {
    const sender = senderScores[idx].senderScore;
    const tfidf = tfidfScores[idx].tfidfScore / maxTfidf; // normalized 0-1
    const fuzzy = fuzzyScores[idx].fuzzyScore;

    // Keyword score: logarithmic scaling of hits
    const kwHits = keywordHits[idx].keywordHits;
    const keyword = kwHits > 0 ? Math.min(0.3 + Math.log2(kwHits + 1) * 0.25, 1.0) : 0;

    const finalScore =
      WEIGHTS.sender * sender +
      WEIGHTS.tfidf * tfidf +
      WEIGHTS.keyword * keyword +
      WEIGHTS.fuzzy * fuzzy;

    return {
      club_id: profile.club_id,
      club_name: profile.club_name,
      finalScore,
      breakdown: { sender, tfidf, fuzzy, keyword },
      keywordHits: kwHits,
      fuzzyMatches: fuzzyScores[idx].fuzzyMatches,
      matchedTerms: tfidfScores[idx].matchedTerms,
    };
  });

  // Sort by final score descending
  combined.sort((a, b) => b.finalScore - a.finalScore);

  // Pick the best match (must be above threshold)
  const THRESHOLD = 0.08; // minimum score to be considered a match
  const best = combined[0];
  const secondBest = combined[1];

  let category = 'General';
  let matchedClubId = null;
  let confidence = 0;
  let isPreferred = false;

  if (best && best.finalScore > THRESHOLD) {
    category = best.club_name;
    matchedClubId = best.club_id;

    // Confidence is the final score, boosted if there's clear separation from 2nd best
    const separation = secondBest ? (best.finalScore - secondBest.finalScore) / best.finalScore : 1;
    confidence = Math.min(best.finalScore * (0.7 + 0.3 * separation), 0.99);

    // Floor confidence at reasonable levels based on signal strength
    if (best.breakdown.sender >= 0.8) confidence = Math.max(confidence, 0.9);
    else if (best.keywordHits >= 3) confidence = Math.max(confidence, 0.7);
    else if (best.keywordHits >= 1 && best.breakdown.tfidf > 0.3) confidence = Math.max(confidence, 0.5);

    // Boost if matched club is in user preferences
    if (matchedClubId && userClubIds.includes(matchedClubId)) {
      isPreferred = true;
    }
  }

  // Event detection
  const eventResult = detectEvent(emailText);

  return {
    ...email,
    matched_club_id: matchedClubId,
    category,
    confidence: Math.round(confidence * 100) / 100, // 2 decimal places
    is_event: eventResult.isEvent ? 1 : 0,
    event_score: eventResult.eventScore,
    is_preferred: isPreferred,
    _debug: {
      topMatches: combined.slice(0, 3).map(c => ({
        club: c.club_name,
        score: Math.round(c.finalScore * 1000) / 1000,
        breakdown: c.breakdown,
      })),
      eventSignals: eventResult.signals,
    },
  };
}

// ─── Main categorization function (replaces the old one) ───
function categorizeEmails(emails, userId) {
  const db = pool.raw;

  // Build club profiles (with expanded synonyms + TF-IDF docs)
  const clubProfiles = buildClubProfiles();

  // Get user's preferred clubs
  const userClubIds = db.prepare(
    'SELECT club_id FROM user_clubs WHERE user_id = ?'
  ).all(userId).map(r => r.club_id);

  return emails.map(email => categorizeEmail(email, clubProfiles, userClubIds));
}

// ─── Re-categorize existing emails (call when rules/profiles updated) ───
function recategorizeAllEmails(userId) {
  const db = pool.raw;

  const existingEmails = db.prepare(
    'SELECT * FROM gmail_emails WHERE user_id = ?'
  ).all(userId);

  if (existingEmails.length === 0) return 0;

  const clubProfiles = buildClubProfiles();
  const userClubIds = db.prepare(
    'SELECT club_id FROM user_clubs WHERE user_id = ?'
  ).all(userId).map(r => r.club_id);

  const update = db.prepare(`
    UPDATE gmail_emails 
    SET category = ?, matched_club_id = ?, confidence = ?, is_event = ?
    WHERE id = ?
  `);

  const updateAll = db.transaction((emails) => {
    let updated = 0;
    for (const email of emails) {
      const result = categorizeEmail(email, clubProfiles, userClubIds);
      update.run(result.category, result.matched_club_id, result.confidence, result.is_event, email.id);
      updated++;
    }
    return updated;
  });

  return updateAll(existingEmails);
}

module.exports = {
  categorizeEmails,
  recategorizeAllEmails,
  detectEvent,
  buildClubProfiles,
  SYNONYM_MAP,
};
