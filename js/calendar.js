'use strict';

/* Minimal calendar widget – depends on events-data.js being loaded first. */

function SvfCalendar(opts) {
  this.calEl    = document.getElementById(opts.calendarId);
  this.listEl   = document.getElementById(opts.listId);
  this.events   = opts.events || [];
  this.today    = new Date();
  this.curYear  = this.today.getFullYear();
  this.curMonth = this.today.getMonth() + 1;
  this.selected = null;
  this.filter   = 'all';
  this._render();
}

/* ---- Update events (called after async load) ---- */
SvfCalendar.prototype.setEvents = function (events) {
  this.events = events || [];
  this._render();
};

/* ---- Internal filters (use this.events, not global functions) ---- */
SvfCalendar.prototype._eventsForMonth = function (year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : '' + month);
  return this.events.filter(function (e) { return e.date.startsWith(prefix); });
};

SvfCalendar.prototype._eventsForDate = function (dateStr) {
  return this.events.filter(function (e) { return e.date === dateStr; });
};

SvfCalendar.prototype._upcoming = function () {
  var today = new Date().toISOString().split('T')[0];
  return this.events
    .filter(function (e) { return e.date >= today; })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
};

/* ---- Render ---- */
SvfCalendar.prototype._render = function () {
  this._renderCal();
  this._renderList();
};

SvfCalendar.prototype._renderCal = function () {
  var self = this;
  var y = this.curYear, m = this.curMonth;
  var monthEvents = this._eventsForMonth(y, m);

  var evtMap = {};
  monthEvents.forEach(function (e) {
    if (!evtMap[e.date]) evtMap[e.date] = [];
    if (evtMap[e.date].indexOf(e.category) === -1) evtMap[e.date].push(e.category);
  });

  var firstDay = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0
  var daysInMonth = new Date(y, m, 0).getDate();
  var todayStr = this.today.toISOString().split('T')[0];

  var monthLabel = new Date(y, m - 1, 1)
    .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  var html = '<div class="cal-widget">';
  html += '<div class="cal-nav">';
  html += '<button class="cal-btn-nav" id="cal-prev" aria-label="Vorheriger Monat">&#8249;</button>';
  html += '<span class="cal-month-label">' + monthLabel + '</span>';
  html += '<button class="cal-btn-nav" id="cal-next" aria-label="Nächster Monat">&#8250;</button>';
  html += '</div><div class="cal-grid">';

  ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(function (d) {
    html += '<div class="cal-head-cell">' + d + '</div>';
  });

  for (var i = 0; i < firstDay; i++) html += '<div class="cal-cell cal-cell-empty"></div>';

  for (var day = 1; day <= daysInMonth; day++) {
    var dd = day < 10 ? '0' + day : '' + day;
    var mm = m  < 10 ? '0' + m   : '' + m;
    var dateStr = y + '-' + mm + '-' + dd;
    var cats = evtMap[dateStr] || [];
    var cls = 'cal-cell' +
      (dateStr === todayStr   ? ' cal-today'    : '') +
      (dateStr === this.selected ? ' cal-selected' : '') +
      (cats.length            ? ' cal-has-events' : '');

    html += '<div class="' + cls + '" data-date="' + dateStr + '">';
    html += '<span class="cal-day-num">' + day + '</span>';
    if (cats.length) {
      html += '<div class="cal-dots">';
      cats.slice(0, 3).forEach(function (cat) {
        var color = (SVF_CATEGORIES[cat] || {}).color || '#94a3b8';
        html += '<span class="cal-dot" style="background:' + color + '"></span>';
      });
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div></div>';

  this.calEl.innerHTML = html;

  document.getElementById('cal-prev').addEventListener('click', function () { self.prevMonth(); });
  document.getElementById('cal-next').addEventListener('click', function () { self.nextMonth(); });
  this.calEl.querySelectorAll('.cal-cell[data-date]').forEach(function (cell) {
    cell.addEventListener('click', function () {
      self.selected = (self.selected === cell.dataset.date) ? null : cell.dataset.date;
      self._render();
    });
  });
};

SvfCalendar.prototype._renderList = function () {
  var events;
  if (this.selected) {
    events = this._eventsForDate(this.selected);
  } else {
    events = this._upcoming();
  }

  if (this.filter !== 'all') {
    var f = this.filter;
    events = events.filter(function (e) { return e.category === f; });
  }

  var heading = this.selected
    ? '<h3 class="events-list-heading">📅 ' + svfFormatDateLong(this.selected) + '</h3>'
    : '<h3 class="events-list-heading">Kommende Veranstaltungen</h3>';

  if (!events.length) {
    this.listEl.innerHTML = heading + '<p class="events-empty">Keine Veranstaltungen' + (this.selected ? ' an diesem Tag.' : '.') + '</p>';
    return;
  }

  var html = heading;
  events.forEach(function (e) {
    var cat = SVF_CATEGORIES[e.category] || { label: e.category, icon: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,.15)' };
    html += '<div class="evt-card evt-card-sm' + (e.highlight ? ' evt-highlight' : '') + '">';
    html += '<div class="evt-card-date"><span class="evt-day">' + svfFormatDate(e.date).slice(0,5) + '</span><span class="evt-time">' + (e.time || '') + '</span></div>';
    html += '<div class="evt-card-body">';
    html += '<span class="evt-badge" style="color:' + cat.color + ';background:' + cat.bg + '">' + cat.icon + ' ' + cat.label + '</span>';
    html += '<h4 class="evt-title">' + escHtml(e.title) + '</h4>';
    html += '<p class="evt-loc">📍 ' + escHtml(e.location || '') + '</p>';
    html += '<p class="evt-desc">' + escHtml(e.description || '') + '</p>';
    html += '</div></div>';
  });

  this.listEl.innerHTML = html;
};

SvfCalendar.prototype.prevMonth = function () {
  this.selected = null;
  if (this.curMonth === 1) { this.curYear--; this.curMonth = 12; }
  else this.curMonth--;
  this._render();
};

SvfCalendar.prototype.nextMonth = function () {
  this.selected = null;
  if (this.curMonth === 12) { this.curYear++; this.curMonth = 1; }
  else this.curMonth++;
  this._render();
};

SvfCalendar.prototype.setFilter = function (cat) {
  this.filter   = cat;
  this.selected = null;
  this._render();
};

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
