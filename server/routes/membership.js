'use strict';

const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_BEITRAG = ['kind', 'erwachsen', 'familie', 'senior'];

function validateMembership(data) {
  const errors = {};
  if (!data.vorname  || String(data.vorname).trim().length < 2)  errors.vorname  = 'Pflichtfeld (min. 2 Zeichen)';
  if (!data.nachname || String(data.nachname).trim().length < 2)  errors.nachname = 'Pflichtfeld (min. 2 Zeichen)';
  if (!data.email    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) errors.email = 'Gültige E-Mail erforderlich';
  if (!data.strasse  || !String(data.strasse).trim())  errors.strasse  = 'Pflichtfeld';
  if (!data.plz      || !/^\d{5}$/.test(String(data.plz)))        errors.plz      = 'Gültige PLZ (5 Ziffern) erforderlich';
  if (!data.ort      || !String(data.ort).trim())      errors.ort      = 'Pflichtfeld';
  if (!data.beitrag  || !VALID_BEITRAG.includes(String(data.beitrag))) errors.beitrag = 'Gültige Beitragskategorie wählen';
  if (!data.eintrittsdatum) errors.eintrittsdatum = 'Pflichtfeld';
  if (!data.kontoinhaber || !String(data.kontoinhaber).trim()) errors.kontoinhaber = 'Pflichtfeld';
  if (!data.iban || String(data.iban).replace(/\s/g, '').length < 15) errors.iban = 'Gültige IBAN erforderlich';
  if (!data.datenschutz_consent) errors.datenschutz_consent = 'Zustimmung erforderlich';
  if (!data.sepa_consent)        errors.sepa_consent        = 'SEPA-Mandat erforderlich';
  if (!data.satzung_consent)     errors.satzung_consent     = 'Satzungsanerkennung erforderlich';
  return Object.keys(errors).length ? errors : null;
}

function s(val, max = 200) {
  return val ? String(val).trim().slice(0, max) : null;
}

/* ---------- POST /api/membership ---------- */
router.post('/', (req, res) => {
  const data = req.body || {};
  const errors = validateMembership(data);
  if (errors) return res.status(400).json({ error: 'Validierungsfehler', details: errors });

  const ibanClean = String(data.iban).replace(/\s/g, '').toUpperCase();
  const abteilungen = Array.isArray(data.abteilungen) ? JSON.stringify(data.abteilungen) : null;

  db.prepare(`
    INSERT INTO memberships
      (anrede,vorname,nachname,geburtsdatum,strasse,plz,ort,telefon,email,
       beitrag,eintrittsdatum,abteilungen,kontoinhaber,iban,bic,bank,newsletter_consent)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    s(data.anrede), s(data.vorname), s(data.nachname), s(data.geburtsdatum),
    s(data.strasse), s(data.plz, 10), s(data.ort),
    s(data.telefon, 30), s(data.email, 200),
    s(data.beitrag, 30), s(data.eintrittsdatum),
    abteilungen,
    s(data.kontoinhaber), ibanClean.slice(0, 34),
    s(data.bic, 15), s(data.bank),
    data.newsletter_consent ? 1 : 0
  );

  res.status(201).json({
    success: true,
    message: `Vielen Dank, ${s(data.vorname)}! Ihr Mitgliedsantrag ist eingegangen. Wir melden uns innerhalb von 3 Werktagen.`,
  });
});

/* ---------- GET /api/membership ---------- */
router.get('/', requireAuth, (req, res) => {
  const statusFilter = req.query.status;
  let stmt;
  if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
    stmt = db.prepare('SELECT * FROM memberships WHERE status=? ORDER BY submitted_at DESC').all(statusFilter);
  } else {
    stmt = db.prepare('SELECT * FROM memberships ORDER BY submitted_at DESC').all();
  }
  // Mask IBAN for list view (show first 4 + last 4 only)
  const result = stmt.map(m => ({
    ...m,
    iban_display: m.iban
      ? m.iban.slice(0, 4) + ' **** **** ' + m.iban.slice(-4)
      : null,
    newsletter_consent: !!m.newsletter_consent,
    abteilungen: m.abteilungen ? JSON.parse(m.abteilungen) : [],
  }));
  res.json(result);
});

/* ---------- GET /api/membership/:id ---------- */
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM memberships WHERE id=?').get(parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({
    ...row,
    newsletter_consent: !!row.newsletter_consent,
    abteilungen: row.abteilungen ? JSON.parse(row.abteilungen) : [],
  });
});

/* ---------- PATCH /api/membership/:id/status ---------- */
router.patch('/:id/status', requireAuth, (req, res) => {
  const id     = parseInt(req.params.id);
  const status = String(req.body.status || '');
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }
  const result = db.prepare('UPDATE memberships SET status=? WHERE id=?').run(status, id);
  if (!result.changes) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ success: true, status });
});

module.exports = router;
