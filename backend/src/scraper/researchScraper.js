const axios = require('axios');
const pool = require('../db/pool');

/**
 * Research scraper using OpenAlex API (free, no auth required)
 * Fetches real publications for IIT Jodhpur professors
 */

const OPENALEX_API = 'https://api.openalex.org';
const IIT_JODHPUR_ROR = 'ror.org/0543z1j85';

// Domain mapping from OpenAlex concepts to our domain IDs
const CONCEPT_TO_DOMAIN = {
  'artificial intelligence': 1,
  'machine learning': 1,
  'computer vision': 2,
  'image processing': 2,
  'natural language processing': 3,
  'computational linguistics': 3,
  'computer security': 4,
  'cryptography': 4,
  'cybersecurity': 4,
  'data science': 5,
  'data mining': 5,
  'robotics': 6,
  'control theory': 6,
  'vlsi': 7,
  'electronic engineering': 7,
  'integrated circuit': 7,
  'signal processing': 8,
  'communications': 9,
  'wireless': 9,
  'networking': 9,
  'power systems': 10,
  'renewable energy': 10,
  'materials science': 11,
  'nanotechnology': 11,
  'algorithm': 12,
  'optimization': 12,
  'distributed computing': 13,
  'cloud computing': 13,
  'bioinformatics': 14,
  'computational biology': 14,
  'quantum computing': 15,
  'quantum': 15,
};

// Get domain ID from publication concepts
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

function buildAbstractFromIndex(abstractIndex, maxWords = 50) {
  if (!abstractIndex || typeof abstractIndex !== 'object') return null;

  const orderedWords = [];
  for (const [word, positions] of Object.entries(abstractIndex)) {
    for (const position of positions || []) {
      orderedWords[position] = word;
    }
  }

  const abstract = orderedWords
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ')
    .trim();

  if (!abstract) return null;
  return orderedWords.length > maxWords ? `${abstract}...` : abstract;
}

// Fetch publications for a professor using OpenAlex
async function fetchProfessorPublications(professor) {
  const publications = [];

  if (!professor.scholar_id) {
    console.log(`[Scraper] No OpenAlex ID for ${professor.name}, skipping...`);
    return publications;
  }

  try {
    console.log(`[Scraper] Fetching from OpenAlex: ${professor.name}`);
    
    const response = await axios.get(`${OPENALEX_API}/works`, {
      params: {
        'filter': `author.id:${professor.scholar_id}`,
        'sort': 'publication_year:desc',
        'per_page': 15,
      },
      timeout: 15000,
      headers: { 'User-Agent': 'CERP/1.0 (mailto:cerp@iitj.ac.in)' },
    });

    const works = response.data.results || [];
    
    for (const work of works) {
      const pub = {
        title: work.title || 'Untitled',
        authors: (work.authorships || [])
          .slice(0, 5)
          .map(a => a.author?.display_name || 'Unknown')
          .join(', '),
        abstract: buildAbstractFromIndex(work.abstract_inverted_index),
        journal: work.primary_location?.source?.display_name || work.host_venue?.display_name || null,
        publication_year: work.publication_year,
        citation_count: work.cited_by_count || 0,
        url: work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : work.id,
        doi: work.doi?.replace('https://doi.org/', '') || null,
        professor_id: professor.id,
        domain_id: getDomainFromConcepts(work.concepts),
      };
      
      publications.push(pub);
    }
    
    console.log(`[Scraper] Found ${publications.length} publications for ${professor.name}`);
  } catch (err) {
    console.log(`[Scraper] Error fetching ${professor.name}: ${err.message}`);
  }

  return publications;
}

// Search IIT Jodhpur authors from OpenAlex
async function searchIITJAuthors(limit = 30) {
  try {
    console.log('[Scraper] Searching IIT Jodhpur authors from OpenAlex...');
    
    const response = await axios.get(`${OPENALEX_API}/authors`, {
      params: {
        'filter': `affiliations.institution.ror:https://${IIT_JODHPUR_ROR}`,
        'sort': 'works_count:desc',
        'per_page': limit,
      },
      timeout: 15000,
      headers: { 'User-Agent': 'CERP/1.0 (mailto:cerp@iitj.ac.in)' },
    });

    return response.data.results || [];
  } catch (err) {
    console.log(`[Scraper] Error searching authors: ${err.message}`);
    return [];
  }
}

// Main function to scrape all professors' research
async function scrapeAllResearch() {
  console.log('[Research Scraper] Starting OpenAlex fetch...');

  try {
    const result = pool.query('SELECT * FROM professors');
    const professors = result.rows;

    let totalNew = 0;

    for (const professor of professors) {
      const publications = await fetchProfessorPublications(professor);

      for (const pub of publications) {
        try {
          // Avoid duplicates by checking title
          const existing = pool.query(
            'SELECT id FROM publications WHERE title = ? AND professor_id = ?',
            [pub.title, pub.professor_id]
          );

          if (existing.rows.length === 0) {
            pool.query(
              `INSERT INTO publications (title, authors, abstract, journal, publication_year, citation_count, url, doi, professor_id, domain_id, scraped_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [pub.title, pub.authors, pub.abstract, pub.journal, pub.publication_year, pub.citation_count, pub.url, pub.doi, pub.professor_id, pub.domain_id]
            );
            totalNew++;
          }
        } catch (insertErr) {
          console.log(`[Scraper] Insert error: ${insertErr.message}`);
        }
      }

      // Rate limiting: 100ms between professors (OpenAlex is generous)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[Research Scraper] Complete. ${totalNew} new publications added.`);
    return totalNew;
  } catch (err) {
    console.error('[Research Scraper] Error:', err.message);
    throw err;
  }
}

module.exports = { scrapeAllResearch, fetchProfessorPublications, searchIITJAuthors };
