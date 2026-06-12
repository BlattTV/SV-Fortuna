'use strict';

/* ================================================================
   SV Fortuna – Events Data Layer
   Fetches events from /api/events and caches them in memory.
   All CRUD operations go through the REST API.
   ================================================================ */

var SVF_CATEGORIES = {
  fest:    { label: 'Fest & Feier',   icon: '🎉', color: '#f59e0b', bg: 'rgba(245,158,11,.15)'  },
  sport:   { label: 'Public Viewing', icon: '⚽', color: '#22c55e', bg: 'rgba(34,197,94,.15)'   },
  party:   { label: 'Party & Disco',  icon: '🎵', color: '#8b5cf6', bg: 'rgba(139,92,246,.15)'  },
  regular: { label: 'Regelbetrieb',   icon: '📅', color: '#3b82f6', bg: 'rgba(59,130,246,.15)'  },
  jugend:  { label: 'Jugend',         icon: '🧒', color: '#ec4899', bg: 'rgba(236,72,153,.15)'  },
};

/* ---- In-memory cache ---- */
var _cache = null;

function svfLoadEvents() {
  if (_cache) return Promise.resolve(_cache);
  return fetch('/api/events')
    .then(function (r) {
      if (!r.ok) throw new Error('Fehler beim Laden der Veranstaltungen');
      return r.json();
    })
    .then(function (events) {
      _cache = events;
      return events;
    });
}

function svfInvalidateCache() { _cache = null; }

/* ---- Sync helpers (only valid after svfLoadEvents resolves) ---- */
function svfGetAllSync()         { return _cache || []; }
function svfGetEventsForDateSync(dateStr) {
  return svfGetAllSync().filter(function (e) { return e.date === dateStr; });
}
function svfGetEventsForMonthSync(year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : '' + month);
  return svfGetAllSync().filter(function (e) { return e.date.startsWith(prefix); });
}
function svfGetUpcomingSync(limit) {
  var today = new Date().toISOString().split('T')[0];
  var all = svfGetAllSync()
    .filter(function (e) { return e.date >= today; })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
  return limit ? all.slice(0, limit) : all;
}

/* ---- REST API calls ---- */
function _apiFetch(url, opts) {
  return fetch(url, Object.assign({ credentials: 'same-origin' }, opts || {}))
    .then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body.error || 'API-Fehler');
        return body;
      });
    });
}

function svfApiAddEvent(data) {
  return _apiFetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(function (evt) { svfInvalidateCache(); return evt; });
}

function svfApiUpdateEvent(id, data) {
  return _apiFetch('/api/events/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(function (evt) { svfInvalidateCache(); return evt; });
}

function svfApiDeleteEvent(id) {
  return _apiFetch('/api/events/' + id, { method: 'DELETE' })
    .then(function () { svfInvalidateCache(); });
}

/* ---- Formatters ---- */
function svfFormatDate(dateStr) {
  if (!dateStr) return '';
  var p = dateStr.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

function svfFormatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch (e) { return svfFormatDate(dateStr); }
}
