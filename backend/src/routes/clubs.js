const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/clubs - List all clubs
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM clubs ORDER BY name';
    let params = [];

    if (category) {
      query = 'SELECT * FROM clubs WHERE category = $1 ORDER BY name';
      params = [category];
    }

    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Clubs error:', err);
    res.status(500).json({ error: 'Failed to fetch clubs.' });
  }
});

// GET /api/clubs/:id
router.get('/:id', (req, res) => {
  try {
    const result = pool.query('SELECT * FROM clubs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch club.' });
  }
});

// POST /api/clubs - Admin/SuperAdmin only
router.post('/', authenticate, authorize('admin', 'superadmin'), (req, res) => {
  try {
    const { name, description, website_url, logo_url, category } = req.body;
    const result = pool.query(
      'INSERT INTO clubs (name, description, website_url, logo_url, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, website_url, logo_url, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create club error:', err);
    res.status(500).json({ error: 'Failed to create club.' });
  }
});

// PUT /api/clubs/:id - Admin/SuperAdmin only
router.put('/:id', authenticate, authorize('admin', 'superadmin'), (req, res) => {
  try {
    const { name, description, website_url, logo_url, category } = req.body;
    const result = pool.query(
      'UPDATE clubs SET name = COALESCE($1, name), description = COALESCE($2, description), website_url = COALESCE($3, website_url), logo_url = COALESCE($4, logo_url), category = COALESCE($5, category) WHERE id = $6 RETURNING *',
      [name, description, website_url, logo_url, category, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Club not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update club.' });
  }
});

// DELETE /api/clubs/:id - SuperAdmin only
router.delete('/:id', authenticate, authorize('superadmin'), (req, res) => {
  try {
    pool.query('DELETE FROM clubs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Club deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete club.' });
  }
});

module.exports = router;
