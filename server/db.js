'use strict';

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'fortuna.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ---- Schema ---- */
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    time        TEXT,
    location    TEXT    DEFAULT 'Sportplatz Griefstedt',
    category    TEXT    NOT NULL CHECK(category IN ('fest','sport','party','regular','jugend')),
    description TEXT,
    highlight   INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    anrede              TEXT,
    vorname             TEXT NOT NULL,
    nachname            TEXT NOT NULL,
    geburtsdatum        TEXT,
    strasse             TEXT,
    plz                 TEXT,
    ort                 TEXT,
    telefon             TEXT,
    email               TEXT NOT NULL,
    beitrag             TEXT,
    eintrittsdatum      TEXT,
    abteilungen         TEXT,
    kontoinhaber        TEXT,
    iban                TEXT,
    bic                 TEXT,
    bank                TEXT,
    newsletter_consent  INTEGER DEFAULT 0,
    submitted_at        TEXT    DEFAULT (datetime('now')),
    status              TEXT    DEFAULT 'pending'
  );
`);

/* ---- Default admin password ---- */
const pwRow = db.prepare("SELECT value FROM admin_config WHERE key = 'admin_password_hash'").get();
if (!pwRow) {
  const hash = bcrypt.hashSync('Fortuna2026!', 12);
  db.prepare("INSERT INTO admin_config (key, value) VALUES ('admin_password_hash', ?)").run(hash);
  console.log('ℹ️  Admin-Passwort initialisiert  →  admin / Fortuna2026!');
}

/* ---- Seed events from poster data ---- */
const evtCount = db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
if (evtCount === 0) {
  const ins = db.prepare(
    'INSERT INTO events (title,date,time,location,category,description,highlight) VALUES (?,?,?,?,?,?,?)'
  );
  const seed = db.transaction(rows => rows.forEach(r =>
    ins.run(r.title, r.date, r.time, r.location, r.category, r.description, r.highlight ? 1 : 0)
  ));
  seed([
    { title: 'Himmelfahrtsfest', date: '2026-05-19', time: '14:00', location: 'Sportplatz Griefstedt', category: 'fest', description: 'Livemusik mit WoHaJo, Outdoorkegelbahn, Speisen und Getränke. Fortuna freut sich auf Euch!', highlight: false },
    { title: 'Freitagsöffnung Sportplatz', date: '2026-05-22', time: '18:00', location: 'Sportplatz Griefstedt', category: 'regular', description: 'Ab dem 22.05. jeden Freitag ab 18 Uhr geöffnet. Kommen Sie vorbei!', highlight: false },
    { title: 'Public Viewing: Deutschland vs. Curaçao', date: '2026-06-14', time: '18:00', location: 'Sportplatz Griefstedt', category: 'sport', description: 'Public Viewing auf dem Sportplatz Griefstedt. Einlass ab 18:00 Uhr, Anpfiff 19:00 Uhr. Fürs leibliche Wohl ist gesorgt!', highlight: false },
    { title: 'Public Viewing: Deutschland vs. Elfenbeinküste', date: '2026-06-20', time: '18:00', location: 'Sportplatz Griefstedt', category: 'sport', description: 'Public Viewing auf dem Sportplatz Griefstedt. Einlass ab 18:00 Uhr, Anpfiff 22:00 Uhr. Fürs leibliche Wohl ist gesorgt!', highlight: false },
    { title: 'Public Viewing: Deutschland vs. Ecuador', date: '2026-06-25', time: '18:00', location: 'Sportplatz Griefstedt', category: 'sport', description: 'Public Viewing auf dem Sportplatz Griefstedt. Einlass ab 18:00 Uhr, Anpfiff 22:00 Uhr. Fürs leibliche Wohl ist gesorgt!', highlight: false },
    { title: 'Heimatfest Griefstedt', date: '2026-06-28', time: '14:00', location: 'Sportplatz Griefstedt', category: 'fest', description: 'Heimatfest für Groß und Klein! Mähdrescher-Hüpfburg, Quarter Horse Reiten, Kegeln, Sackhüpfen, Tauziehen. Der Rost brennt! Mit DJ Tobias und der Freiwilligen Feuerwehr Griefstedt.', highlight: true },
    { title: 'Open Air Disco', date: '2026-07-04', time: '18:00', location: 'Sportplatz Griefstedt', category: 'party', description: 'Open Air Disco für Jugendliche von 11–18 Jahren mit DJ. Eintritt: 2€. (Datum vorläufig – aktuelle Aushänge beachten!)', highlight: true },
  ]);
  console.log('ℹ️  Events aus Plakaten in Datenbank eingefügt.');
}

module.exports = db;
