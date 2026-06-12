'use strict';

require('dotenv').config();

const express    = require('express');
const session    = require('express-session');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

// Ensure data directory for session store
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SQLiteStore = require('connect-sqlite3')(session);

const app  = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SESSION_SECRET || 'svfortuna-dev-secret-change-in-production';

if (SECRET === 'svfortuna-dev-secret-change-in-production') {
  console.warn('⚠️  SESSION_SECRET nicht gesetzt – .env.example → .env kopieren!');
}

/* ---------- Security headers ---------- */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
    },
  },
  referrerPolicy: { policy: 'same-origin' },
}));

/* ---------- Body parsers ---------- */
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

/* ---------- Session ---------- */
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'svf.sid',
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000,           // 8 h
    secure:   process.env.NODE_ENV === 'production',
  },
}));

/* ---------- Rate limiting ---------- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ---------- API Routes ---------- */
app.use('/api/auth',       loginLimiter, require('./routes/auth'));
app.use('/api/events',                  require('./routes/events'));
app.use('/api/membership', formLimiter, require('./routes/membership'));

/* ---------- Static files ---------- */
app.use(express.static(path.join(__dirname, '..')));

/* ---------- API 404 ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint nicht gefunden' }));

/* ---------- Fallback (SPA-style) ---------- */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* ---------- Error handler ---------- */
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`\n✅  SV Fortuna Server läuft → http://localhost:${PORT}`);
  console.log(`📋  Admin-Panel             → http://localhost:${PORT}/admin/`);
  console.log(`🔑  Standard-Login          → admin / Fortuna2026!\n`);
});

module.exports = app;
