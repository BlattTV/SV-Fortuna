'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const db       = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();

/* ---------- POST /api/auth/login ---------- */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich.' });
  }

  if (String(username).trim().toLowerCase() !== ADMIN_USERNAME) {
    // Constant-time-like delay even on wrong user to prevent user enumeration
    await bcrypt.compare('dummy', '$2a$12$dummy.hash.to.prevent.timing.attack.padding.xxx');
    return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
  }

  const row = db.prepare("SELECT value FROM admin_config WHERE key = 'admin_password_hash'").get();
  if (!row) return res.status(500).json({ error: 'Admin nicht konfiguriert.' });

  const match = await bcrypt.compare(String(password), row.value);
  if (!match) return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Sitzungsfehler.' });
    req.session.authenticated = true;
    req.session.loginAt = Date.now();
    res.json({ success: true });
  });
});

/* ---------- POST /api/auth/logout ---------- */
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* ---------- GET /api/auth/status ---------- */
router.get('/status', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

/* ---------- POST /api/auth/change-password ---------- */
router.post('/change-password', requireAuth, async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein.' });
  }
  const hash = await bcrypt.hash(String(newPassword), 12);
  db.prepare("INSERT OR REPLACE INTO admin_config (key, value) VALUES ('admin_password_hash', ?)").run(hash);
  res.json({ success: true });
});

module.exports = router;
