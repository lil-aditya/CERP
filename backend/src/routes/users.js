const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper to fetch preferences for a user
function getUserPreferences(userId) {
  const clubs = pool.query(
    'SELECT c.id, c.name FROM clubs c INNER JOIN user_clubs uc ON c.id = uc.club_id WHERE uc.user_id = $1',
    [userId]
  ).rows;

  const domains = pool.query(
    'SELECT d.id, d.name FROM domains d INNER JOIN user_domains ud ON d.id = ud.domain_id WHERE ud.user_id = $1',
    [userId]
  ).rows;

  return { clubs, domains };
}

// PUT /api/users/preferences - Update user's selected clubs and domains
router.put('/preferences', authenticate, (req, res) => {
  try {
    const { clubIds, domainIds } = req.body;
    const userId = req.user.id;

    // Use a transaction via the raw sqlite instance
    const db = pool.raw;
    const runTransaction = db.transaction(() => {
      // Update clubs
      if (Array.isArray(clubIds)) {
        db.prepare('DELETE FROM user_clubs WHERE user_id = ?').run(userId);
        const insertClub = db.prepare('INSERT OR IGNORE INTO user_clubs (user_id, club_id) VALUES (?, ?)');
        for (const clubId of clubIds) {
          insertClub.run(userId, clubId);
        }
      }

      // Update domains
      if (Array.isArray(domainIds)) {
        db.prepare('DELETE FROM user_domains WHERE user_id = ?').run(userId);
        const insertDomain = db.prepare('INSERT OR IGNORE INTO user_domains (user_id, domain_id) VALUES (?, ?)');
        for (const domainId of domainIds) {
          insertDomain.run(userId, domainId);
        }
      }
    });

    runTransaction();

    const preferences = getUserPreferences(userId);
    res.json({ message: 'Preferences updated.', preferences });
  } catch (err) {
    console.error('Preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

// GET /api/users/preferences
router.get('/preferences', authenticate, (req, res) => {
  try {
    const preferences = getUserPreferences(req.user.id);
    res.json(preferences);
  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

module.exports = router;
