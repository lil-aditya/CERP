const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/events - List events with filtering (any authenticated user)
router.get('/', (req, res) => {
  try {
    const { category, club_id, from_date, to_date, is_university, search } = req.query;
    let query = `
      SELECT e.*, c.name as club_name 
      FROM events e 
      LEFT JOIN clubs c ON e.club_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ` AND e.category = ?`;
      params.push(category);
    }
    if (club_id) {
      query += ` AND e.club_id = ?`;
      params.push(club_id);
    }
    if (from_date) {
      query += ` AND e.event_date >= ?`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND e.event_date <= ?`;
      params.push(to_date);
    }
    if (is_university === 'true') {
      query += ` AND e.is_university_event = 1`;
    }
    if (search) {
      query += ` AND (e.title LIKE ? OR e.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY e.event_date ASC';

    const db = pool.raw;
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Events error:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// GET /api/events/calendar - Events for calendar view (month-based)
router.get('/calendar', (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()} 23:59:59`;

    const db = pool.raw;
    const rows = db.prepare(
      `SELECT e.*, c.name as club_name 
       FROM events e 
       LEFT JOIN clubs c ON e.club_id = c.id 
       WHERE e.event_date >= ? AND e.event_date <= ?
       ORDER BY e.event_date ASC`
    ).all(startDate, endDate);
    res.json(rows);
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events.' });
  }
});

// GET /api/events/feed - Personalized feed based on user's subscribed clubs
router.get('/feed', authenticate, (req, res) => {
  try {
    const db = pool.raw;
    const rows = db.prepare(
      `SELECT e.*, c.name as club_name 
       FROM events e 
       LEFT JOIN clubs c ON e.club_id = c.id 
       WHERE e.club_id IN (SELECT club_id FROM user_clubs WHERE user_id = ?)
          OR e.is_university_event = 1
       ORDER BY e.event_date ASC`
    ).all(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to fetch event feed.' });
  }
});

// GET /api/events/clashes - Detect overlapping events
router.get('/clashes', authenticate, (req, res) => {
  try {
    const db = pool.raw;
    // Find all pairs of events whose time ranges overlap
    const clashes = db.prepare(`
      SELECT 
        a.id as event_a_id, a.title as event_a_title, a.event_date as event_a_start, a.end_date as event_a_end, a.location as event_a_location,
        b.id as event_b_id, b.title as event_b_title, b.event_date as event_b_start, b.end_date as event_b_end, b.location as event_b_location
      FROM events a
      INNER JOIN events b ON a.id < b.id
      WHERE a.end_date IS NOT NULL AND b.end_date IS NOT NULL
        AND a.event_date < b.end_date
        AND b.event_date < a.end_date
      ORDER BY a.event_date ASC
    `).all();

    res.json({ count: clashes.length, clashes });
  } catch (err) {
    console.error('Clash detection error:', err);
    res.status(500).json({ error: 'Failed to detect clashes.' });
  }
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  try {
    const db = pool.raw;
    const event = db.prepare(
      `SELECT e.*, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id WHERE e.id = ?`
    ).get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// POST /api/events - Admin/SuperAdmin only — includes clash detection
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { title, description, event_date, end_date, location, club_id, category, is_university_event } = req.body;

    // Validation
    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and event_date are required.' });
    }
    if (end_date && new Date(end_date) < new Date(event_date)) {
      return res.status(400).json({ error: 'end_date cannot be before event_date.' });
    }

    const db = pool.raw;

    // Clash detection: find overlapping events in the same location or same time
    let conflicts = [];
    if (end_date) {
      conflicts = db.prepare(`
        SELECT id, title, event_date, end_date, location
        FROM events
        WHERE end_date IS NOT NULL
          AND event_date < ? AND end_date > ?
          AND (location = ? OR ? IS NULL OR location IS NULL)
      `).all(end_date, event_date, location || null, location || null);
    }

    const info = db.prepare(
      `INSERT INTO events (title, description, event_date, end_date, location, club_id, category, is_university_event, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(title, description || null, event_date, end_date || null, location || null,
          club_id || null, category || null, is_university_event ? 1 : 0, req.user.id);

    const created = db.prepare(
      'SELECT e.*, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id WHERE e.id = ?'
    ).get(info.lastInsertRowid);

    res.status(201).json({
      event: created,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      warning: conflicts.length > 0 ? `This event overlaps with ${conflicts.length} existing event(s).` : undefined,
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

// PUT /api/events/:id - Admin/SuperAdmin
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { title, description, event_date, end_date, location, club_id, category, is_university_event } = req.body;
    const db = pool.raw;

    // Check event exists
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found.' });

    db.prepare(`
      UPDATE events SET 
        title = COALESCE(?, title), description = COALESCE(?, description), 
        event_date = COALESCE(?, event_date), end_date = COALESCE(?, end_date),
        location = COALESCE(?, location), club_id = COALESCE(?, club_id),
        category = COALESCE(?, category), is_university_event = COALESCE(?, is_university_event)
       WHERE id = ?`
    ).run(
      title || null, description || null, event_date || null, end_date || null,
      location || null, club_id || null, category || null,
      is_university_event != null ? (is_university_event ? 1 : 0) : null,
      req.params.id
    );

    const updated = db.prepare(
      'SELECT e.*, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id WHERE e.id = ?'
    ).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

// DELETE /api/events/:id - Admin/SuperAdmin
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const db = pool.raw;
    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found.' });

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

module.exports = router;
