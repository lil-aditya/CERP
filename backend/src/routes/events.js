const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/events - List events with filtering
router.get('/', async (req, res) => {
  try {
    const { category, club_id, from_date, to_date, is_university, search } = req.query;
    let query = `
      SELECT e.*, c.name as club_name 
      FROM events e 
      LEFT JOIN clubs c ON e.club_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (category) {
      query += ` AND e.category = $${paramIdx++}`;
      params.push(category);
    }
    if (club_id) {
      query += ` AND e.club_id = $${paramIdx++}`;
      params.push(club_id);
    }
    if (from_date) {
      query += ` AND e.event_date >= $${paramIdx++}`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND e.event_date <= $${paramIdx++}`;
      params.push(to_date);
    }
    if (is_university === 'true') {
      query += ` AND e.is_university_event = true`;
    }
    if (search) {
      query += ` AND (e.title ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ' ORDER BY e.event_date ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Events error:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// GET /api/events/calendar - Events for calendar view (month-based)
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0]; // last day of month

    const result = await pool.query(
      `SELECT e.*, c.name as club_name 
       FROM events e 
       LEFT JOIN clubs c ON e.club_id = c.id 
       WHERE e.event_date >= $1 AND e.event_date <= $2
       ORDER BY e.event_date ASC`,
      [startDate, endDate + ' 23:59:59']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events.' });
  }
});

// GET /api/events/feed - Personalized feed based on user's subscribed clubs
router.get('/feed', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c.name as club_name 
       FROM events e 
       LEFT JOIN clubs c ON e.club_id = c.id 
       WHERE e.club_id IN (SELECT club_id FROM user_clubs WHERE user_id = $1)
          OR e.is_university_event = true
       ORDER BY e.event_date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to fetch event feed.' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// POST /api/events - Admin/SuperAdmin
router.post('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { title, description, event_date, end_date, location, club_id, category, is_university_event } = req.body;
    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, end_date, location, club_id, category, is_university_event, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, event_date, end_date, location, club_id, category, is_university_event || false, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

// PUT /api/events/:id - Admin/SuperAdmin
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { title, description, event_date, end_date, location, club_id, category, is_university_event } = req.body;
    const result = await pool.query(
      `UPDATE events SET 
        title = COALESCE($1, title), description = COALESCE($2, description), 
        event_date = COALESCE($3, event_date), end_date = COALESCE($4, end_date),
        location = COALESCE($5, location), club_id = COALESCE($6, club_id),
        category = COALESCE($7, category), is_university_event = COALESCE($8, is_university_event)
       WHERE id = $9 RETURNING *`,
      [title, description, event_date, end_date, location, club_id, category, is_university_event, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

// DELETE /api/events/:id - Admin/SuperAdmin
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

module.exports = router;
