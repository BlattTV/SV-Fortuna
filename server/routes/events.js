'use strict';

const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_CATEGORIES = ['fest', 'sport', 'party', 'regular', 'jugend'];

/* ---- Input validation ---- */
function validateEvent(data) {
  const errors = {};
  const title = String(data.title || '').trim();
  const date  = String(data.date  || '').trim();
  const cat   = String(data.category || '').trim();

  if (!title)              errors.title    = 'Pflichtfeld';
  else if (title.length > 200) errors.title = 'Maximal 200 Zeichen';

  if (!date)               errors.date     = 'Pflichtfeld';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Format: YYYY-MM-DD';

  if (!cat)                errors.category = 'Pflichtfeld';
  else if (!VALID_CATEGORIES.includes(cat)) errors.category = 'Ungültige Kategorie';

  if (data.time && !/^\d{2}:\d{2}$/.test(String(data.time))) errors.time = 'Format: HH:MM';
  if (data.description && String(data.description).length > 2000) errors.description = 'Maximal 2000 Zeichen';

  return Object.keys(errors).length ? errors : null;
}

function sanitize(data) {
  return {
    title:       String(data.title       || '').trim().slice(0, 200),
    date:        String(data.date        || '').trim(),
    time:        data.time       ? String(data.time).trim()       : null,
    location:    data.location   ? String(data.location).trim().slice(0, 200) : 'Sportplatz Griefstedt',
    category:    String(data.category    || '').trim(),
    description: data.description ? String(data.description).trim().slice(0, 2000) : null,
    highlight:   data.highlight ? 1 : 0,
  };
}

/* ---------- GET /api/events ---------- */
router.get('/', (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY date ASC, time ASC').all();
  res.json(events.map(e => ({ ...e, highlight: !!e.highlight })));
});

/* ---------- GET /api/events/upcoming ---------- */
router.get('/upcoming', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const limit = Math.min(parseInt(req.query.limit) || 50, 50);
  const events = db.prepare(
    'SELECT * FROM events WHERE date >= ? ORDER BY date ASC, time ASC LIMIT ?'
  ).all(today, limit);
  res.json(events.map(e => ({ ...e, highlight: !!e.highlight })));
});

/* ---------- POST /api/events ---------- */
router.post('/', requireAuth, (req, res) => {
  const errors = validateEvent(req.body);
  if (errors) return res.status(400).json({ error: 'Validierungsfehler', details: errors });

  const d = sanitize(req.body);
  const result = db.prepare(
    'INSERT INTO events (title,date,time,location,category,description,highlight) VALUES (?,?,?,?,?,?,?)'
  ).run(d.title, d.date, d.time, d.location, d.category, d.description, d.highlight);

  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...created, highlight: !!created.highlight });
});

/* ---------- PUT /api/events/:id ---------- */
router.put('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Ungültige ID' });

  const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });

  const errors = validateEvent(req.body);
  if (errors) return res.status(400).json({ error: 'Validierungsfehler', details: errors });

  const d = sanitize(req.body);
  db.prepare(
    'UPDATE events SET title=?,date=?,time=?,location=?,category=?,description=?,highlight=? WHERE id=?'
  ).run(d.title, d.date, d.time, d.location, d.category, d.description, d.highlight, id);

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.json({ ...updated, highlight: !!updated.highlight });
});

/* ---------- DELETE /api/events/:id ---------- */
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Ungültige ID' });

  const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
  res.json({ success: true });
});

module.exports = router;
