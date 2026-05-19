const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const semanticSearch = require('../services/semanticSearch');

const router = express.Router();

// GET /api/announcements - List announcements with filtering
router.get('/', async (req, res) => {
  try {
    const { club_id, search, limit, semantic } = req.query;
    let query = `
      SELECT a.*, c.name as club_name 
      FROM announcements a 
      LEFT JOIN clubs c ON a.club_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (club_id) {
      query += ` AND a.club_id = ?`;
      params.push(club_id);
    }
    const useSemanticSearch = search && semantic !== 'false';

    if (search && !useSemanticSearch) {
      query += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const result = pool.query(query, params);

    if (useSemanticSearch) {
      const ranked = await semanticSearch.semanticRankRows(
        result.rows,
        search,
        'announcement',
        semanticSearch.announcementText,
        { minScore: 0.04 }
      );
      return res.json(limit ? ranked.slice(0, parseInt(limit)) : ranked);
    }

    const rows = result.rows.sort((a, b) =>
      String(b.published_at || '').localeCompare(String(a.published_at || ''))
    );
    res.json(limit ? rows.slice(0, parseInt(limit)) : rows);
  } catch (err) {
    console.error('Announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// GET /api/announcements/feed - Personalized announcement feed
router.get('/feed', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const rows = await semanticSearch.rankAnnouncementsForUser(req.user.id, limit);
    res.json(rows);
  } catch (err) {
    console.error('Announcement feed error:', err);
    res.status(500).json({ error: 'Failed to fetch announcement feed.' });
  }
});

module.exports = router;
