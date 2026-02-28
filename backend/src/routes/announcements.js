const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/announcements - List announcements with filtering
router.get('/', (req, res) => {
  try {
    const { club_id, search, limit } = req.query;
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
    if (search) {
      query += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY a.published_at DESC';

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
    }

    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// GET /api/announcements/feed - Personalized announcement feed
router.get('/feed', authenticate, (req, res) => {
  try {
    const result = pool.query(
      `SELECT a.*, c.name as club_name 
       FROM announcements a 
       LEFT JOIN clubs c ON a.club_id = c.id 
       WHERE a.club_id IN (SELECT club_id FROM user_clubs WHERE user_id = ?)
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
