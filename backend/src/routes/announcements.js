const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/announcements - List announcements with filtering
router.get('/', async (req, res) => {
  try {
    const { club_id, search, limit } = req.query;
    let query = `
      SELECT a.*, c.name as club_name 
      FROM announcements a 
      LEFT JOIN clubs c ON a.club_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (club_id) {
      query += ` AND a.club_id = $${paramIdx++}`;
      params.push(club_id);
    }
    if (search) {
      query += ` AND (a.title ILIKE $${paramIdx} OR a.content ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ' ORDER BY a.published_at DESC';

    if (limit) {
      query += ` LIMIT $${paramIdx++}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// GET /api/announcements/feed - Personalized announcement feed
router.get('/feed', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.name as club_name 
       FROM announcements a 
       LEFT JOIN clubs c ON a.club_id = c.id 
       WHERE a.club_id IN (SELECT club_id FROM user_clubs WHERE user_id = $1)
       ORDER BY a.published_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Announcement feed error:', err);
    res.status(500).json({ error: 'Failed to fetch announcement feed.' });
  }
});

module.exports = router;
