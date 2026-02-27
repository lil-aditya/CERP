const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and at least admin role

// GET /api/admin/users - List all users (admin & superadmin)
router.get('/users', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// PUT /api/admin/users/:id/role - Change user role (superadmin only)
router.put('/users/:id/role', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superadmin.' });
    }

    // Prevent demoting yourself
    if (parseInt(req.params.id) === req.user.id && role !== 'superadmin') {
      return res.status(400).json({ error: 'Cannot change your own role.' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Role updated.', user: result.rows[0] });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// DELETE /api/admin/users/:id - Delete user (superadmin only)
router.delete('/users/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// POST /api/admin/users - Create user with specific role (superadmin only)
router.post('/users', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (role && !['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password_hash, role || 'user']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// GET /api/admin/stats - Dashboard stats (admin & superadmin)
router.get('/stats', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const [users, clubs, events, publications, announcements] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM clubs'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query('SELECT COUNT(*) FROM publications'),
      pool.query('SELECT COUNT(*) FROM announcements'),
    ]);
    res.json({
      users: parseInt(users.rows[0].count),
      clubs: parseInt(clubs.rows[0].count),
      events: parseInt(events.rows[0].count),
      publications: parseInt(publications.rows[0].count),
      announcements: parseInt(announcements.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
