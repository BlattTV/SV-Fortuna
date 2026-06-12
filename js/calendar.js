'use strict';

/* Minimal calendar widget – depends on events-data.js */

function SvfCalendar(opts) {
  this.calEl    = document.getElementById(opts.calendarId);
  this.listEl   = document.getElementById(opts.listId);
  this.today    = new Date();
  this.curYear  = this.today.getFullYear();
  this.curMonth = this.today.getMonth() + 1; // 1-12
  this.selected = null;
  this.filter   = 'all';
  this._render();
}

SvfCalendar.prototype._monthName = function (year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

SvfCalendar.prototype._render = function () {
  this._renderCal();
  this._renderList();
};

SvfCalendar.prototype._renderCal = function () {
  var self = this;
  var y = this.curYear, m = this.curMonth;
  var monthEvents = svfGetEventsForMonth(y, m);

  // Build date→categories map
  var evtMap = {};
  monthEvents.forEach(function (e) {
    if (!evtMap[e.date]) evtMap[e.date] = [];
    if (evtMap[e.date].indexOf(e.category) === -1) evtMap[e.date].push(e.category);
  });

  var firstDay = new Date(y, m - 1, 1).getDay(); // 0=Sun
  // Convert to Mon-start (0=Mon…6=Sun)
  firstDay = (firstDay + 6) % 7;
  var daysInMonth = new Date(y, m, 0).getDate();
  var todayStr = this.today.toISOString().split('T')[0];

  var html = '<div class="cal-widget">';
  html += '<div class="cal-nav">';
  html += '<button class="cal-btn-nav" id="cal-prev" aria-label="Vorheriger Monat">&#8249;</button>';
  html += '<span class="cal-month-label">' + this._monthName(y, m) + '</span>';
  html += '<button class="cal-btn-nav" id="cal-next" aria-label="Nächster Monat">&#8250;</button>';
  html += '</div>';

  html += '<div class="cal-grid">';
  ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(function (d) {
    html += '<div class="cal-head-cell">' + d + '</div>';
  });

  // Empty cells before 1st
  for (var i = 0; i < firstDay; i++) html += '<div class="cal-cell cal-cell-empty"></div>';

  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr = y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
    var cats = evtMap[dateStr] || [];
    var cls = 'cal-cell';
    if (dateStr === todayStr) cls += ' cal-today';
    if (dateStr === this.selected) cls += ' cal-selected';
    if (cats.length) cls += ' cal-has-events';

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
  html += '</div></div>'; // cal-grid, cal-widget

  this.calEl.innerHTML = html;

  // Events
  var self = this;
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
    events = svfGetEventsForDate(this.selected);
  } else {
    events = svfGetUpcoming(20);
  }

  if (this.filter !== 'all') {
    events = events.filter(function (e) { return e.category === this.filter; }.bind(this));
  }

  var heading = this.selected
    ? '<h3 class="events-list-heading">📅 ' + svfFormatDateLong(this.selected) + '</h3>'
    : '<h3 class="events-list-heading">Kommende Veranstaltungen</h3>';

  if (!events.length) {
    this.listEl.innerHTML = heading + '<p class="events-empty">Keine Veranstaltungen' + (this.selected ? ' an diesem Tag' : '') + '.</p>';
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
    html += '<p class="evt-loc">📍 ' + escHtml(e.location) + '</p>';
    html += '<p class="evt-desc">' + escHtml(e.description) + '</p>';
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
  this.filter = cat;
  this.selected = null;
  this._render();
};

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
