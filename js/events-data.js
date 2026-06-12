'use strict';

var SVF_EVENTS_KEY = 'svfortuna_events_v1';

var SVF_CATEGORIES = {
  fest:    { label: 'Fest & Feier',  icon: '🎉', color: '#f59e0b', bg: 'rgba(245,158,11,.15)'  },
  sport:   { label: 'Public Viewing',icon: '⚽', color: '#22c55e', bg: 'rgba(34,197,94,.15)'   },
  party:   { label: 'Party & Disco', icon: '🎵', color: '#8b5cf6', bg: 'rgba(139,92,246,.15)'  },
  regular: { label: 'Regelbetrieb',  icon: '📅', color: '#3b82f6', bg: 'rgba(59,130,246,.15)'  },
  jugend:  { label: 'Jugend',        icon: '🧒', color: '#ec4899', bg: 'rgba(236,72,153,.15)'  },
};

var SVF_DEFAULT_EVENTS = [
  {
    id: 'evt-001',
    title: 'Himmelfahrtsfest',
    date: '2026-05-19',
    time: '14:00',
    location: 'Sportplatz Griefstedt',
    category: 'fest',
    description: 'Livemusik mit WoHaJo, Outdoorkegelbahn, Speisen und Getränke. Fortuna freut sich auf Euch!',
    highlight: false
  },
  {
    id: 'evt-002',
    title: 'Freitagsöffnung Sportplatz',
    date: '2026-05-22',
    time: '18:00',
    location: 'Sportplatz Griefstedt',
    category: 'regular',
    description: 'Ab dem 22.05. jeden Freitag ab 18 Uhr geöffnet. Kommen Sie vorbei und genießen Sie den Sommerabend auf unserem Sportplatz!',
    highlight: false
  },
  {
    id: 'evt-003',
    title: 'Public Viewing: Deutschland vs. Curaçao',
    date: '2026-06-14',
    time: '18:00',
    location: 'Sportplatz Griefstedt',
    category: 'sport',
    description: 'Public Viewing auf dem Sportplatz Griefstedt. Einlass ab 18:00 Uhr, Anpfiff 19:00 Uhr. Fürs leibliche Wohl ist gesorgt!',
    highlight: false
  },
  {
    id: 'evt-004',
    title: 'Public Viewing: Deutschland vs. Elfenbeinküste',
    date: '2026-06-20',
    time: '18:00',
    location: 'Sportplatz Griefstedt',
    category: 'sport',
    description: 'Public Viewing auf dem Sportplatz Griefstedt. Einlass ab 18:00 Uhr, Anpfiff 22:00 Uhr. Fürs leibliche Wohl ist gesorgt!',
    highlight: false
  },
  {
    id: 'evt-005',
    title: 'Public Viewing: Deutschland vs. Ecuador',
    date: '2026-06-25',
    time: '18:00',
    location: 'Sportplatz Griefstedt',
    category: 'sport',
    description: 'Public Viewing auf dem Sportplatz Griefstedt. Einlass ab 18:00 Uhr, Anpfiff 22:00 Uhr. Fürs leibliche Wohl ist gesorgt!',
    highlight: false
  },
  {
    id: 'evt-006',
    title: 'Heimatfest Griefstedt',
    date: '2026-06-28',
    time: '14:00',
    location: 'Sportplatz Griefstedt',
    category: 'fest',
    description: 'Heimatfest für Groß und Klein! Mähdrescher-Hüpfburg, Quarter Horse Reiten, Kegeln, Sackhüpfen, Tauziehen und viele weitere Spiele. Der Rost brennt und die Muttis haben fleißig gebacken! Mit DJ Tobias und der Freiwilligen Feuerwehr Griefstedt. Herzlich eingeladen von SV Fortuna Griefstedt e.V.',
    highlight: true
  },
  {
    id: 'evt-007',
    title: 'Open Air Disco',
    date: '2026-07-04',
    time: '18:00',
    location: 'Sportplatz Griefstedt',
    category: 'party',
    description: 'Open Air Disco für Jugendliche von 11–18 Jahren mit DJ. Eintritt: 2€. (Datum vorläufig – aktuelle Aushänge beachten!)',
    highlight: true
  }
];

function svfGetEvents() {
  try {
    var stored = localStorage.getItem(SVF_EVENTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return svfInitEvents();
}

function svfInitEvents() {
  var events = JSON.parse(JSON.stringify(SVF_DEFAULT_EVENTS));
  try { localStorage.setItem(SVF_EVENTS_KEY, JSON.stringify(events)); } catch (e) {}
  return events;
}

function svfSaveEvents(events) {
  try { localStorage.setItem(SVF_EVENTS_KEY, JSON.stringify(events)); } catch (e) {}
}

function svfAddEvent(evt) {
  var events = svfGetEvents();
  evt.id = 'evt-' + Date.now();
  evt.createdAt = new Date().toISOString();
  events.push(evt);
  svfSaveEvents(events);
  return evt;
}

function svfUpdateEvent(id, data) {
  var events = svfGetEvents();
  var idx = -1;
  for (var i = 0; i < events.length; i++) { if (events[i].id === id) { idx = i; break; } }
  if (idx === -1) return false;
  events[idx] = Object.assign({}, events[idx], data);
  svfSaveEvents(events);
  return true;
}

function svfDeleteEvent(id) {
  svfSaveEvents(svfGetEvents().filter(function (e) { return e.id !== id; }));
}

function svfGetUpcoming(limit) {
  var today = new Date().toISOString().split('T')[0];
  var all = svfGetEvents()
    .filter(function (e) { return e.date >= today; })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
  return limit ? all.slice(0, limit) : all;
}

function svfGetEventsForDate(dateStr) {
  return svfGetEvents().filter(function (e) { return e.date === dateStr; });
}

function svfGetEventsForMonth(year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : '' + month);
  return svfGetEvents().filter(function (e) { return e.date.startsWith(prefix); });
}

function svfFormatDate(dateStr) {
  if (!dateStr) return '';
  var p = dateStr.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

function svfFormatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch (e) { return svfFormatDate(dateStr); }
}
