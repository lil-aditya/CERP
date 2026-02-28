const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { scrapeAllResearch } = require('../scraper/researchScraper');

const router = express.Router();

// GET /api/research - Search & filter publications
router.get('/', (req, res) => {
  try {
    const { search, department, domain_id, professor_id, year_from, year_to, min_citations, sort_by, order } = req.query;
    let query = `
      SELECT p.*, pr.name as professor_name, pr.department, d.name as domain_name
      FROM publications p
      LEFT JOIN professors pr ON p.professor_id = pr.id
      LEFT JOIN domains d ON p.domain_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.title LIKE ? OR p.authors LIKE ? OR p.abstract LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department) {
      query += ` AND pr.department = ?`;
      params.push(department);
    }
    if (domain_id) {
      query += ` AND p.domain_id = ?`;
      params.push(domain_id);
    }
    if (professor_id) {
      query += ` AND p.professor_id = ?`;
      params.push(professor_id);
    }
    if (year_from) {
      query += ` AND p.publication_year >= ?`;
      params.push(parseInt(year_from));
    }
    if (year_to) {
      query += ` AND p.publication_year <= ?`;
      params.push(parseInt(year_to));
    }
    if (min_citations) {
      query += ` AND p.citation_count >= ?`;
      params.push(parseInt(min_citations));
    }

    // Sorting
    const validSorts = ['citation_count', 'publication_year', 'title', 'created_at'];
    const sortField = validSorts.includes(sort_by) ? sort_by : 'publication_year';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY p.${sortField} ${sortOrder}`;

    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Research error:', err);
    res.status(500).json({ error: 'Failed to fetch publications.' });
  }
});

// GET /api/research/feed - Personalized research based on user domains
router.get('/feed', authenticate, (req, res) => {
  try {
    const result = pool.query(
      `SELECT p.*, pr.name as professor_name, pr.department, d.name as domain_name
       FROM publications p
       LEFT JOIN professors pr ON p.professor_id = pr.id
       LEFT JOIN domains d ON p.domain_id = d.id
       WHERE p.domain_id IN (SELECT domain_id FROM user_domains WHERE user_id = ?)
       ORDER BY p.publication_year DESC, p.citation_count DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Research feed error:', err);
    res.status(500).json({ error: 'Failed to fetch research feed.' });
  }
});

// GET /api/research/professors - List professors
router.get('/professors', (req, res) => {
  try {
    const { department } = req.query;
    let query = 'SELECT * FROM professors ORDER BY name';
    let params = [];

    if (department) {
      query = 'SELECT * FROM professors WHERE department = ? ORDER BY name';
      params = [department];
    }

    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch professors.' });
  }
});

// GET /api/research/domains - List all domains
router.get('/domains', (req, res) => {
  try {
    const result = pool.query('SELECT * FROM domains ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domains.' });
  }
});

// POST /api/research/scrape - Trigger scraping of publications from OpenAlex
router.post('/scrape', authenticate, async (req, res) => {
  try {
    console.log('[API] Scrape triggered by user:', req.user.id);
    const newCount = await scrapeAllResearch();
    res.json({ success: true, message: `Scraped ${newCount} new publications from OpenAlex.` });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape publications.' });
  }
});

// GET /api/research/:id - Must be LAST (catch-all param route)
router.get('/:id', (req, res) => {
  try {
    const result = pool.query(
      `SELECT p.*, pr.name as professor_name, pr.department, d.name as domain_name
       FROM publications p
       LEFT JOIN professors pr ON p.professor_id = pr.id
       LEFT JOIN domains d ON p.domain_id = d.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Publication not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch publication.' });
  }
});

module.exports = router;
