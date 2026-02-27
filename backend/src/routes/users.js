const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// PUT /api/users/preferences - Update user's selected clubs and domains
router.put('/preferences', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { clubIds, domainIds } = req.body;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Update clubs
    if (Array.isArray(clubIds)) {
      await client.query('DELETE FROM user_clubs WHERE user_id = $1', [userId]);
      for (const clubId of clubIds) {
        await client.query('INSERT INTO user_clubs (user_id, club_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, clubId]);
      }
    }

    // Update domains
    if (Array.isArray(domainIds)) {
      await client.query('DELETE FROM user_domains WHERE user_id = $1', [userId]);
      for (const domainId of domainIds) {
        await client.query('INSERT INTO user_domains (user_id, domain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, domainId]);
      }
    }

    await client.query('COMMIT');

    // Return updated preferences
    const result = await pool.query(
      `SELECT 
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) FILTER (WHERE c.id IS NOT NULL), '[]') AS clubs,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') AS domains
       FROM users u
       LEFT JOIN user_clubs uc ON u.id = uc.user_id
       LEFT JOIN clubs c ON uc.club_id = c.id
       LEFT JOIN user_domains ud ON u.id = ud.user_id
       LEFT JOIN domains d ON ud.domain_id = d.id
       WHERE u.id = $1`,
      [userId]
    );

    res.json({ message: 'Preferences updated.', preferences: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences.' });
  } finally {
    client.release();
  }
});

// GET /api/users/preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) FILTER (WHERE c.id IS NOT NULL), '[]') AS clubs,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') AS domains
       FROM users u
       LEFT JOIN user_clubs uc ON u.id = uc.user_id
       LEFT JOIN clubs c ON uc.club_id = c.id
       LEFT JOIN user_domains ud ON u.id = ud.user_id
       LEFT JOIN domains d ON ud.domain_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

module.exports = router;
