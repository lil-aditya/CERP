const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/users - List all users (admin & superadmin)
router.get('/users', authenticate, requireAdmin, (req, res) => {
  try {
    const result = pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// PUT /api/admin/users/:id/role - Change user role (superadmin only)
router.put('/users/:id/role', authenticate, requireSuperAdmin, (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superadmin.' });
    }

    // Prevent demoting yourself
    if (parseInt(req.params.id) === req.user.id && role !== 'superadmin') {
      return res.status(400).json({ error: 'Cannot change your own role.' });
    }

    const db = pool.raw;
    db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .run(role, req.params.id);

    const updated = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(req.params.id);

    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Role updated.', user: updated });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// DELETE /api/admin/users/:id - Delete user (superadmin only)
router.delete('/users/:id', authenticate, requireSuperAdmin, (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }
    pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// POST /api/admin/users - Create user with specific role (superadmin only)
router.post('/users', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (role && !['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    // Check for duplicate email
    const existing = pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const db = pool.raw;
    const info = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email.toLowerCase().trim(), password_hash, role || 'user');

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(info.lastInsertRowid);

    res.status(201).json(user);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// GET /api/admin/stats - Dashboard stats (admin & superadmin)
router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const db = pool.raw;
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const clubs = db.prepare('SELECT COUNT(*) as count FROM clubs').get().count;
    const events = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const publications = db.prepare('SELECT COUNT(*) as count FROM publications').get().count;
    const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get().count;

    res.json({ users, clubs, events, publications, announcements });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
