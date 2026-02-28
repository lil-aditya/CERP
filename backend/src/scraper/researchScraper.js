const axios = require('axios');
const pool = require('../db/pool');

const OPENALEX_API = 'https://api.openalex.org';

const CONCEPT_TO_DOMAIN = {
  'artificial intelligence': 1, 'machine learning': 1, 'computer vision': 2,
  'image processing': 2, 'natural language processing': 3, 'computer security': 4,
  'cryptography': 4, 'data science': 5, 'robotics': 6, 'vlsi': 7,
  'signal processing': 8, 'communications': 9, 'power systems': 10,
  'materials science': 11, 'algorithm': 12, 'distributed computing': 13,
  'bioinformatics': 14, 'quantum': 15,
};

function getDomainFromConcepts(concepts) {
  if (!concepts || !concepts.length) return null;
  for (const concept of concepts) {
    const name = (concept.display_name || '').toLowerCase();
    for (const [key, domainId] of Object.entries(CONCEPT_TO_DOMAIN)) {
      if (name.includes(key)) return domainId;
    }
  }
  return null;
}

async function fetchProfessorPublications(professor) {
  const publications = [];
  if (!professor.scholar_id) {
    console.log('[Scraper] No OpenAlex ID for ' + professor.name);
    return publications;
  }

  try {
    console.log('[Scraper] Fetching: ' + professor.name + ' (' + professor.scholar_id + ')');
    const response = await axios.get(OPENALEX_API + '/works', {
      params: { 'filter': 'author.id:' + professor.scholar_id, 'sort': 'publication_year:desc', 'per_page': 15 },
      timeout: 15000,
      headers: { 'User-Agent': 'CERP/1.0' },
    });

    const works = response.data.results || [];
    for (const work of works) {
      publications.push({
        title: work.title || 'Untitled',
        authors: (work.authorships || []).slice(0, 5).map(a => a.author?.display_name || 'Unknown').join(', '),
        abstract: work.abstract_inverted_index ? Object.keys(work.abstract_inverted_index).slice(0, 50).join(' ') + '...' : null,
        journal: work.primary_location?.source?.display_name || null,
        publication_year: work.publication_year,
        citation_count: work.cited_by_count || 0,
        url: work.doi ? 'https://doi.org/' + work.doi.replace('https://doi.org/', '') : work.id,
        doi: work.doi?.replace('https://doi.org/', '') || null,
        professor_id: professor.id,
        domain_id: getDomainFromConcepts(work.concepts),
      });
    }
    console.log('[Scraper] Found ' + publications.length + ' publications');
  } catch (err) {
    console.log('[Scraper] Error: ' + err.message);
  }
  return publications;
}

async function scrapeAllResearch() {
  console.log('[Research Scraper] Starting...');
  try {
    const result = pool.query('SELECT * FROM professors');
    const professors = result.rows;
    let totalNew = 0;
    const now = new Date().toISOString();

    for (const professor of professors) {
      const publications = await fetchProfessorPublications(professor);
      for (const pub of publications) {
        try {
          const existing = pool.query('SELECT id FROM publications WHERE title = ? AND professor_id = ?', [pub.title, pub.professor_id]);
          if (existing.rows.length === 0) {
            pool.query(
              'INSERT INTO publications (title, authors, abstract, journal, publication_year, citation_count, url, doi, professor_id, domain_id, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [pub.title, pub.authors, pub.abstract, pub.journal, pub.publication_year, pub.citation_count, pub.url, pub.doi, pub.professor_id, pub.domain_id, now]
            );
            totalNew++;
          }
        } catch (e) { console.log('[Scraper] Insert error: ' + e.message); }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    console.log('[Scraper] Complete. ' + totalNew + ' new publications.');
    return totalNew;
  } catch (err) {
    console.error('[Scraper] Error:', err.message);
    throw err;
  }
}

module.exports = { scrapeAllResearch, fetchProfessorPublications };
