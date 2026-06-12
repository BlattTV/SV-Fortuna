'use strict';

/* ===================================================================
   SV Fortuna – Admin Panel (server-side auth & REST API)
   =================================================================== */

/* ---------- State ---------- */
var _adminEvents      = [];
var _adminMemberships = [];
var pendingDeleteId   = null;
var sortState         = { col: 'date', dir: 1 };

/* ---------- UI helpers ---------- */
function show(id) { var el = document.getElementById(id); if (el) el.hidden = false; }
function hide(id) { var el = document.getElementById(id); if (el) el.hidden = true; }
function escH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showScreen(name) {
  ['screen-login','screen-dashboard'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.hidden = id !== name;
  });
}

/* ---------- API helper ---------- */
function apiFetch(url, opts) {
  return fetch(url, Object.assign({ credentials: 'same-origin' }, opts || {}))
    .then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body.error || 'API-Fehler');
        return body;
      });
    });
}

/* ---------- Auth ---------- */
function checkAuthStatus() {
  return fetch('/api/auth/status', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (d) { return !!d.authenticated; });
}

function doLogin(username, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password }),
  });
}

function doLogout() {
  return fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
}

function doChangePassword(newPassword) {
  return apiFetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword: newPassword }),
  });
}

/* ---------- Stats ---------- */
function updateStats() {
  var today      = new Date().toISOString().split('T')[0];
  var upcoming   = _adminEvents.filter(function (e) { return e.date >= today; }).length;
  var highlights = _adminEvents.filter(function (e) { return e.highlight; }).length;
  var pending    = _adminMemberships.filter(function (m) { return m.status === 'pending'; }).length;

  var sTotal = document.getElementById('stat-total');
  var sUp    = document.getElementById('stat-upcoming');
  var sHi    = document.getElementById('stat-highlights');
  var sPend  = document.getElementById('stat-pending');

  if (sTotal) sTotal.textContent = _adminEvents.length;
  if (sUp)    sUp.textContent    = upcoming;
  if (sHi)    sHi.textContent    = highlights;
  if (sPend)  sPend.textContent  = pending;
}

/* ---------- Tab switching ---------- */
function switchTab(tab) {
  var panelEvt  = document.getElementById('panel-events');
  var panelMemb = document.getElementById('panel-memberships');
  var tabEvt    = document.getElementById('tab-events');
  var tabMemb   = document.getElementById('tab-memberships');

  if (panelEvt)  panelEvt.hidden  = (tab !== 'events');
  if (panelMemb) panelMemb.hidden = (tab !== 'memberships');
  if (tabEvt)    tabEvt.classList.toggle('active',  tab === 'events');
  if (tabMemb)   tabMemb.classList.toggle('active', tab === 'memberships');

  if (tab === 'memberships') loadMemberships();
}

/* ================================================================
   EVENTS
   ================================================================ */

function loadAdminEvents() {
  svfInvalidateCache();
  return svfLoadEvents().then(function (events) {
    _adminEvents = events;
    renderEventsTable();
    updateStats();
  });
}

/* ---------- Table rendering ---------- */
function renderEventsTable() {
  var search    = (document.getElementById('admin-search')     || {}).value || '';
  var catFilter = (document.getElementById('admin-filter-cat') || {}).value || '';
  var tbody     = document.getElementById('admin-events-tbody');
  var emptyEl   = document.getElementById('admin-empty');
  if (!tbody) return;

  var events = _adminEvents.slice();

  if (search) {
    var q = search.toLowerCase();
    events = events.filter(function (e) {
      return ((e.title || '') + (e.description || '') + (e.location || '')).toLowerCase().indexOf(q) !== -1;
    });
  }
  if (catFilter) events = events.filter(function (e) { return e.category === catFilter; });

  events.sort(function (a, b) {
    var va = a[sortState.col] || '', vb = b[sortState.col] || '';
    return va < vb ? -sortState.dir : va > vb ? sortState.dir : 0;
  });

  if (!events.length) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  var today = new Date().toISOString().split('T')[0];
  var html  = '';
  events.forEach(function (e) {
    var cat    = SVF_CATEGORIES[e.category] || { label: e.category, icon: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,.15)' };
    var isPast = e.date < today;
    html += '<tr class="' + (isPast ? 'row-past' : '') + '" data-id="' + e.id + '">';
    html += '<td class="td-date"><strong>' + escH(svfFormatDate(e.date)) + '</strong>' + (e.time ? '<br><small>' + escH(e.time) + ' Uhr</small>' : '') + '</td>';
    html += '<td class="td-title">' + escH(e.title) + '</td>';
    html += '<td><span class="evt-badge" style="color:' + cat.color + ';background:' + cat.bg + '">' + cat.icon + ' ' + escH(cat.label) + '</span></td>';
    html += '<td class="td-loc"><small>' + escH(e.location || '') + '</small></td>';
    html += '<td class="td-hl">' + (e.highlight ? '⭐' : '') + '</td>';
    html += '<td class="td-actions">';
    html += '<button class="admin-btn-action btn-edit"   data-id="' + e.id + '" title="Bearbeiten">✏️</button>';
    html += '<button class="admin-btn-action btn-delete" data-id="' + e.id + '" data-title="' + escH(e.title) + '" title="Löschen">🗑️</button>';
    html += '</td></tr>';
  });
  tbody.innerHTML = html;

  tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
    btn.addEventListener('click', function () { openEditModal(parseInt(btn.dataset.id, 10)); });
  });
  tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
    btn.addEventListener('click', function () { openDeleteModal(parseInt(btn.dataset.id, 10), btn.dataset.title); });
  });
}

/* ---------- Sort columns ---------- */
document.querySelectorAll('.sort-col').forEach(function (th) {
  th.addEventListener('click', function () {
    var col = th.dataset.sort;
    if (sortState.col === col) sortState.dir = -sortState.dir;
    else { sortState.col = col; sortState.dir = 1; }
    renderEventsTable();
  });
});

/* ---------- Modal helpers ---------- */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.hidden = true;
  document.body.style.overflow = '';
}

/* ---------- Event Modal (Add / Edit) ---------- */
function clearEventForm() {
  ['edit-id','evt-title','evt-date','evt-time','evt-description'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var cat = document.getElementById('evt-category');
  if (cat) cat.value = '';
  var loc = document.getElementById('evt-location');
  if (loc) loc.value = 'Sportplatz Griefstedt';
  var hl = document.getElementById('evt-highlight');
  if (hl) hl.checked = false;
  document.querySelectorAll('#event-form .field-error').forEach(function (el) { el.textContent = ''; });
  document.querySelectorAll('#event-form input, #event-form select, #event-form textarea').forEach(function (el) {
    el.classList.remove('error', 'valid');
  });
}

function openAddModal() {
  clearEventForm();
  var t = document.getElementById('modal-title');
  if (t) t.textContent = 'Neue Veranstaltung';
  var d = document.getElementById('evt-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
  openModal('modal-event');
}

function openEditModal(id) {
  var evt = null;
  for (var i = 0; i < _adminEvents.length; i++) {
    if (_adminEvents[i].id === id) { evt = _adminEvents[i]; break; }
  }
  if (!evt) return;
  clearEventForm();
  document.getElementById('edit-id').value        = evt.id;
  document.getElementById('evt-title').value       = evt.title || '';
  document.getElementById('evt-date').value        = evt.date || '';
  document.getElementById('evt-time').value        = evt.time || '';
  document.getElementById('evt-category').value    = evt.category || '';
  document.getElementById('evt-location').value    = evt.location || 'Sportplatz Griefstedt';
  document.getElementById('evt-description').value = evt.description || '';
  document.getElementById('evt-highlight').checked = !!evt.highlight;
  var t = document.getElementById('modal-title');
  if (t) t.textContent = 'Veranstaltung bearbeiten';
  openModal('modal-event');
}

function openDeleteModal(id, title) {
  pendingDeleteId = id;
  var el = document.getElementById('delete-evt-title');
  if (el) el.textContent = '"' + title + '"';
  openModal('modal-delete');
}

/* ---------- Event Form Submit ---------- */
document.getElementById('event-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var title = document.getElementById('evt-title').value.trim();
  var date  = document.getElementById('evt-date').value;
  var cat   = document.getElementById('evt-category').value;
  var valid = true;

  function setErr(fieldId, msg) {
    var inp = document.getElementById(fieldId);
    if (inp && inp.parentElement) {
      var errEl = inp.parentElement.querySelector('.field-error');
      if (errEl) errEl.textContent = msg;
    }
    if (inp) inp.classList.toggle('error', !!msg);
    if (msg) valid = false;
  }

  setErr('evt-title',    title ? '' : 'Titel ist erforderlich.');
  setErr('evt-date',     date  ? '' : 'Datum ist erforderlich.');
  setErr('evt-category', cat   ? '' : 'Kategorie ist erforderlich.');
  if (!valid) return;

  var saveBtn = document.getElementById('modal-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Speichere…'; }

  var data = {
    title:       title,
    date:        date,
    time:        document.getElementById('evt-time').value || null,
    category:    cat,
    location:    document.getElementById('evt-location').value.trim() || 'Sportplatz Griefstedt',
    description: document.getElementById('evt-description').value.trim() || null,
    highlight:   document.getElementById('evt-highlight').checked,
  };

  var editId  = parseInt(document.getElementById('edit-id').value, 10);
  var promise = editId ? svfApiUpdateEvent(editId, data) : svfApiAddEvent(data);

  promise
    .then(function () { return svfLoadEvents(); })
    .then(function (events) {
      _adminEvents = events;
      closeModal('modal-event');
      renderEventsTable();
      updateStats();
    })
    .catch(function (err) { alert('Fehler beim Speichern: ' + err.message); })
    .finally(function () {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Speichern'; }
    });
});

/* ---------- Delete Confirm ---------- */
document.getElementById('del-confirm').addEventListener('click', function () {
  if (!pendingDeleteId) return;
  var id = pendingDeleteId;
  pendingDeleteId = null;
  closeModal('modal-delete');

  svfApiDeleteEvent(id)
    .then(function () { return svfLoadEvents(); })
    .then(function (events) {
      _adminEvents = events;
      renderEventsTable();
      updateStats();
    })
    .catch(function (err) { alert('Löschen fehlgeschlagen: ' + err.message); });
});

/* ================================================================
   MEMBERSHIPS
   ================================================================ */

var STATUS_LABELS = { pending: 'Ausstehend', approved: 'Genehmigt', rejected: 'Abgelehnt' };
var STATUS_COLORS = { pending: '#f59e0b',    approved: '#22c55e',    rejected: '#ef4444'   };
var BEITRAG_LABELS = { kind: 'Kind', erwachsen: 'Erwachsen', familie: 'Familie', senior: 'Senior' };

function loadMemberships() {
  fetch('/api/membership', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      _adminMemberships = data;
      renderMembershipsTable();
      updateStats();
    })
    .catch(function (err) { console.error('Mitgliedschaften laden:', err); });
}

function renderMembershipsTable() {
  var tbody   = document.getElementById('admin-memb-tbody');
  var emptyEl = document.getElementById('admin-memb-empty');
  if (!tbody) return;

  var filter = (document.getElementById('memb-filter-status') || {}).value || '';
  var search = (document.getElementById('memb-search')        || {}).value || '';

  var members = _adminMemberships.slice();
  if (filter) members = members.filter(function (m) { return m.status === filter; });
  if (search) {
    var q = search.toLowerCase();
    members = members.filter(function (m) {
      return ((m.vorname || '') + ' ' + (m.nachname || '') + ' ' + (m.email || '')).toLowerCase().indexOf(q) !== -1;
    });
  }

  if (!members.length) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  var html = '';
  members.forEach(function (m) {
    var status = m.status || 'pending';
    var color  = STATUS_COLORS[status]  || '#94a3b8';
    var label  = STATUS_LABELS[status]  || status;
    var datePart = (m.submitted_at || '').split('T')[0].split(' ')[0];
    html += '<tr data-id="' + m.id + '">';
    html += '<td><small>' + escH(datePart) + '</small></td>';
    html += '<td><strong>' + escH((m.vorname || '') + ' ' + (m.nachname || '')) + '</strong></td>';
    html += '<td>' + escH(m.email || '') + '</td>';
    html += '<td>' + escH(BEITRAG_LABELS[m.beitrag] || m.beitrag || '') + '</td>';
    html += '<td><span class="status-badge" style="background:' + color + '20;color:' + color + ';border:1px solid ' + color + '40">' + escH(label) + '</span></td>';
    html += '<td class="td-actions">';
    html += '<button class="admin-btn-action btn-memb-detail"  data-id="' + m.id + '" title="Details">👁</button>';
    if (status === 'pending') {
      html += '<button class="admin-btn-action btn-memb-approve" data-id="' + m.id + '" title="Genehmigen" style="color:#22c55e">✔</button>';
      html += '<button class="admin-btn-action btn-memb-reject"  data-id="' + m.id + '" title="Ablehnen"   style="color:#ef4444">✘</button>';
    }
    html += '</td></tr>';
  });
  tbody.innerHTML = html;

  tbody.querySelectorAll('.btn-memb-detail').forEach(function (btn) {
    btn.addEventListener('click', function () { openMembDetail(parseInt(btn.dataset.id, 10)); });
  });
  tbody.querySelectorAll('.btn-memb-approve').forEach(function (btn) {
    btn.addEventListener('click', function () { changeMembStatus(parseInt(btn.dataset.id, 10), 'approved'); });
  });
  tbody.querySelectorAll('.btn-memb-reject').forEach(function (btn) {
    btn.addEventListener('click', function () { changeMembStatus(parseInt(btn.dataset.id, 10), 'rejected'); });
  });
}

function changeMembStatus(id, status) {
  fetch('/api/membership/' + id + '/status', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: status }),
  })
  .then(function (r) { return r.json(); })
  .then(function () {
    return fetch('/api/membership', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
  })
  .then(function (data) {
    _adminMemberships = data;
    renderMembershipsTable();
    updateStats();
  })
  .catch(function (err) { alert('Statusänderung fehlgeschlagen: ' + err.message); });
}

function openMembDetail(id) {
  fetch('/api/membership/' + id, { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (m) {
      var abt  = Array.isArray(m.abteilungen) ? m.abteilungen.join(', ') : '–';
      var html = '<dl class="detail-grid">';
      html += '<dt>Name</dt><dd>' + escH([(m.anrede || ''), m.vorname, m.nachname].filter(Boolean).join(' ')) + '</dd>';
      html += '<dt>Geburtsdatum</dt><dd>' + escH(m.geburtsdatum ? svfFormatDate(m.geburtsdatum) : '–') + '</dd>';
      html += '<dt>Adresse</dt><dd>' + escH((m.strasse || '') + ', ' + (m.plz || '') + ' ' + (m.ort || '')) + '</dd>';
      html += '<dt>Telefon</dt><dd>' + escH(m.telefon || '–') + '</dd>';
      html += '<dt>E-Mail</dt><dd>' + escH(m.email || '') + '</dd>';
      html += '<dt>Beitragskategorie</dt><dd>' + escH(BEITRAG_LABELS[m.beitrag] || m.beitrag || '–') + '</dd>';
      html += '<dt>Eintrittsdatum</dt><dd>' + escH(m.eintrittsdatum ? svfFormatDate(m.eintrittsdatum) : '–') + '</dd>';
      html += '<dt>Abteilungen</dt><dd>' + escH(abt) + '</dd>';
      html += '<dt>Kontoinhaber</dt><dd>' + escH(m.kontoinhaber || '–') + '</dd>';
      html += '<dt>IBAN</dt><dd><code>' + escH(m.iban || '–') + '</code></dd>';
      if (m.bic)  html += '<dt>BIC</dt><dd>' + escH(m.bic) + '</dd>';
      if (m.bank) html += '<dt>Bank</dt><dd>' + escH(m.bank) + '</dd>';
      html += '<dt>Newsletter</dt><dd>' + (m.newsletter_consent ? 'Ja' : 'Nein') + '</dd>';
      html += '<dt>Eingereicht am</dt><dd>' + escH(m.submitted_at || '–') + '</dd>';
      html += '</dl>';

      var body = document.getElementById('memb-detail-body');
      if (body) body.innerHTML = html;

      var statusEl = document.getElementById('memb-detail-status');
      if (statusEl) {
        var s = m.status || 'pending';
        var c = STATUS_COLORS[s] || '#94a3b8';
        statusEl.innerHTML = '<span class="status-badge" style="background:' + c + '20;color:' + c + ';border:1px solid ' + c + '40">' + escH(STATUS_LABELS[s] || s) + '</span>';
      }

      var approveBtn = document.getElementById('memb-modal-approve');
      var rejectBtn  = document.getElementById('memb-modal-reject');
      if (approveBtn) { approveBtn.dataset.id = m.id; approveBtn.hidden = m.status !== 'pending'; }
      if (rejectBtn)  { rejectBtn.dataset.id  = m.id; rejectBtn.hidden  = m.status !== 'pending'; }

      openModal('modal-memb-detail');
    })
    .catch(function (err) { alert('Fehler beim Laden: ' + err.message); });
}

/* ================================================================
   CHANGE PASSWORD
   ================================================================ */

document.getElementById('change-pw-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var pw1 = document.getElementById('new-pw').value;
  var pw2 = document.getElementById('new-pw2').value;

  document.getElementById('pw-error').textContent  = '';
  document.getElementById('pw2-error').textContent = '';
  hide('pw-form-error'); hide('pw-form-success');

  if (pw1.length < 8) { document.getElementById('pw-error').textContent = 'Mindestens 8 Zeichen.'; return; }
  if (pw1 !== pw2)    { document.getElementById('pw2-error').textContent = 'Passwörter stimmen nicht überein.'; return; }

  doChangePassword(pw1)
    .then(function () {
      show('pw-form-success');
      document.getElementById('new-pw').value  = '';
      document.getElementById('new-pw2').value = '';
      setTimeout(function () { closeModal('modal-pw'); }, 1800);
    })
    .catch(function (err) {
      var el = document.getElementById('pw-form-error');
      el.textContent = err.message;
      show('pw-form-error');
    });
});

/* ================================================================
   CLOSE BUTTONS & KEYBOARD
   ================================================================ */

['modal-close','modal-cancel'].forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', function () { closeModal('modal-event'); });
});
['modal-pw-close','modal-pw-cancel'].forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', function () { closeModal('modal-pw'); });
});

var delClose = document.getElementById('modal-del-close');
if (delClose) delClose.addEventListener('click', function () { closeModal('modal-delete'); });
var delCancel = document.getElementById('del-cancel');
if (delCancel) delCancel.addEventListener('click', function () { closeModal('modal-delete'); });

var membClose = document.getElementById('modal-memb-close');
if (membClose) membClose.addEventListener('click', function () { closeModal('modal-memb-detail'); });

['modal-event','modal-delete','modal-pw','modal-memb-detail'].forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', function (ev) { if (ev.target === el) closeModal(id); });
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    ['modal-event','modal-delete','modal-pw','modal-memb-detail'].forEach(function (id) { closeModal(id); });
  }
});

/* ================================================================
   BUTTON WIRING
   ================================================================ */

document.getElementById('btn-add-event').addEventListener('click', openAddModal);

document.getElementById('btn-logout').addEventListener('click', function () {
  doLogout().finally(function () { showScreen('screen-login'); });
});

document.getElementById('btn-change-pw').addEventListener('click', function () { openModal('modal-pw'); });

var searchEl = document.getElementById('admin-search');
if (searchEl) searchEl.addEventListener('input', renderEventsTable);
var filterEl = document.getElementById('admin-filter-cat');
if (filterEl) filterEl.addEventListener('change', renderEventsTable);

var membSearchEl = document.getElementById('memb-search');
if (membSearchEl) membSearchEl.addEventListener('input', renderMembershipsTable);
var membFilterEl = document.getElementById('memb-filter-status');
if (membFilterEl) membFilterEl.addEventListener('change', renderMembershipsTable);

var tabEvtBtn  = document.getElementById('tab-events');
var tabMembBtn = document.getElementById('tab-memberships');
if (tabEvtBtn)  tabEvtBtn.addEventListener('click',  function () { switchTab('events'); });
if (tabMembBtn) tabMembBtn.addEventListener('click',  function () { switchTab('memberships'); });

var membApproveBtn = document.getElementById('memb-modal-approve');
var membRejectBtn  = document.getElementById('memb-modal-reject');
if (membApproveBtn) {
  membApproveBtn.addEventListener('click', function () {
    changeMembStatus(parseInt(membApproveBtn.dataset.id, 10), 'approved');
    closeModal('modal-memb-detail');
  });
}
if (membRejectBtn) {
  membRejectBtn.addEventListener('click', function () {
    changeMembStatus(parseInt(membRejectBtn.dataset.id, 10), 'rejected');
    closeModal('modal-memb-detail');
  });
}

/* ---------- Password visibility toggle ---------- */
var pwToggle = document.getElementById('pw-toggle');
if (pwToggle) {
  pwToggle.addEventListener('click', function () {
    var inp = document.getElementById('login-pw');
    if (!inp) return;
    if (inp.type === 'password') { inp.type = 'text'; pwToggle.textContent = '🙈'; }
    else { inp.type = 'password'; pwToggle.textContent = '👁'; }
  });
}

/* ================================================================
   LOGIN FORM
   ================================================================ */

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var user  = document.getElementById('login-user').value;
  var pw    = document.getElementById('login-pw').value;
  var btn   = document.getElementById('login-btn');
  var errEl = document.getElementById('login-error');

  hide('login-error');
  btn.disabled = true;
  btn.querySelector('.btn-text').hidden    = true;
  btn.querySelector('.btn-spinner').hidden = false;

  doLogin(user, pw)
    .then(function () {
      hide('default-pw-hint');
      showScreen('screen-dashboard');
      loadAdminEvents();
    })
    .catch(function (err) {
      errEl.textContent = err.message || 'Benutzername oder Passwort falsch.';
      show('login-error');
    })
    .finally(function () {
      btn.disabled = false;
      btn.querySelector('.btn-text').hidden    = false;
      btn.querySelector('.btn-spinner').hidden = true;
    });
});

/* ================================================================
   INIT
   ================================================================ */

(function init() {
  checkAuthStatus().then(function (authenticated) {
    if (authenticated) {
      hide('default-pw-hint');
      showScreen('screen-dashboard');
      loadAdminEvents();
    } else {
      showScreen('screen-login');
    }
  }).catch(function () {
    showScreen('screen-login');
  });
})();
