'use strict';

/* ===================================================================
   SV Fortuna – Admin Panel
   Default login: admin / Fortuna2026!  (change after first login!)
   Auth is localStorage/sessionStorage based (static-site demo only).
   =================================================================== */

var ADMIN_USER       = 'admin';
var ADMIN_DEFAULT_PW = 'Fortuna2026!';
var HASH_KEY         = 'svf_admin_hash';
var SESSION_KEY      = 'svf_admin_session';

/* ---------- Crypto helpers ---------- */
function hashPw(pw) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)).then(function (buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  });
}

/* ---------- Session ---------- */
function isLoggedIn() {
  var s = sessionStorage.getItem(SESSION_KEY);
  if (!s) return false;
  // Auto-expire after 8 hours
  if (Date.now() - parseInt(s, 10) > 8 * 60 * 60 * 1000) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

function setSession() { sessionStorage.setItem(SESSION_KEY, Date.now().toString()); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

/* ---------- Password check ---------- */
function checkLogin(user, pw) {
  if (user.trim().toLowerCase() !== ADMIN_USER) return Promise.resolve(false);
  var stored = localStorage.getItem(HASH_KEY);
  if (!stored) {
    // First login: accept default, then store hash
    if (pw === ADMIN_DEFAULT_PW) {
      return hashPw(pw).then(function (h) { localStorage.setItem(HASH_KEY, h); return true; });
    }
    return Promise.resolve(false);
  }
  return hashPw(pw).then(function (h) { return h === stored; });
}

function changePw(newPw) {
  if (!newPw || newPw.length < 8) return Promise.reject(new Error('Passwort zu kurz (min. 8 Zeichen).'));
  return hashPw(newPw).then(function (h) { localStorage.setItem(HASH_KEY, h); });
}

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

/* ---------- Stats ---------- */
function updateStats() {
  var all = svfGetEvents();
  var today = new Date().toISOString().split('T')[0];
  var upcoming  = all.filter(function (e) { return e.date >= today; }).length;
  var highlights = all.filter(function (e) { return e.highlight; }).length;
  var sTotal = document.getElementById('stat-total');
  var sUp    = document.getElementById('stat-upcoming');
  var sHi    = document.getElementById('stat-highlights');
  if (sTotal) sTotal.textContent = all.length;
  if (sUp)    sUp.textContent    = upcoming;
  if (sHi)    sHi.textContent    = highlights;
}

/* ---------- Table rendering ---------- */
var sortState = { col: 'date', dir: 1 };

function renderTable() {
  var search   = (document.getElementById('admin-search') || {}).value || '';
  var catFilter = (document.getElementById('admin-filter-cat') || {}).value || '';
  var tbody    = document.getElementById('admin-events-tbody');
  var emptyEl  = document.getElementById('admin-empty');
  if (!tbody) return;

  var events = svfGetEvents();

  // Filter
  if (search) {
    var q = search.toLowerCase();
    events = events.filter(function (e) {
      return (e.title + e.description + e.location).toLowerCase().indexOf(q) !== -1;
    });
  }
  if (catFilter) events = events.filter(function (e) { return e.category === catFilter; });

  // Sort
  events.sort(function (a, b) {
    var va = a[sortState.col] || '', vb = b[sortState.col] || '';
    return va < vb ? -sortState.dir : va > vb ? sortState.dir : 0;
  });

  if (!events.length) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    updateStats();
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  var today = new Date().toISOString().split('T')[0];
  var html = '';
  events.forEach(function (e) {
    var cat = SVF_CATEGORIES[e.category] || { label: e.category, icon: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,.15)' };
    var isPast = e.date < today;
    html += '<tr class="' + (isPast ? 'row-past' : '') + '" data-id="' + escH(e.id) + '">';
    html += '<td class="td-date"><strong>' + escH(svfFormatDate(e.date)) + '</strong>' + (e.time ? '<br><small>' + escH(e.time) + ' Uhr</small>' : '') + '</td>';
    html += '<td class="td-title">' + escH(e.title) + '</td>';
    html += '<td><span class="evt-badge" style="color:' + cat.color + ';background:' + cat.bg + '">' + cat.icon + ' ' + escH(cat.label) + '</span></td>';
    html += '<td class="td-loc"><small>' + escH(e.location || '') + '</small></td>';
    html += '<td class="td-hl">' + (e.highlight ? '⭐' : '') + '</td>';
    html += '<td class="td-actions">';
    html += '<button class="admin-btn-action btn-edit" data-id="' + escH(e.id) + '" title="Bearbeiten">✏️</button>';
    html += '<button class="admin-btn-action btn-delete" data-id="' + escH(e.id) + '" data-title="' + escH(e.title) + '" title="Löschen">🗑️</button>';
    html += '</td></tr>';
  });
  tbody.innerHTML = html;
  updateStats();

  // Action buttons
  tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
    btn.addEventListener('click', function () { openEditModal(btn.dataset.id); });
  });
  tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
    btn.addEventListener('click', function () { openDeleteModal(btn.dataset.id, btn.dataset.title); });
  });
}

/* ---------- Sort columns ---------- */
document.querySelectorAll('.sort-col').forEach(function (th) {
  th.addEventListener('click', function () {
    var col = th.dataset.sort;
    if (sortState.col === col) sortState.dir = -sortState.dir;
    else { sortState.col = col; sortState.dir = 1; }
    renderTable();
  });
});

/* ---------- Modal helpers ---------- */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) { el.hidden = false; el.focus && el.focus(); }
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.hidden = true;
  document.body.style.overflow = '';
}

/* ---------- Event Modal (Add/Edit) ---------- */
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
  document.querySelectorAll('#event-form input, #event-form select').forEach(function (el) {
    el.classList.remove('error', 'valid');
  });
}

function openAddModal() {
  clearEventForm();
  var t = document.getElementById('modal-title');
  if (t) t.textContent = 'Neue Veranstaltung';
  openModal('modal-event');
  var d = document.getElementById('evt-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
}

function openEditModal(id) {
  var events = svfGetEvents();
  var evt = null;
  for (var i = 0; i < events.length; i++) { if (events[i].id === id) { evt = events[i]; break; } }
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

/* ---------- Delete Modal ---------- */
var pendingDeleteId = null;
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

  function setErr(id, msg) {
    var el = document.querySelector('#event-form [id="' + id + '"] + .field-error, #event-form .form-group:has(#' + id + ') .field-error');
    // Fallback: get sibling
    var inp = document.getElementById(id);
    if (inp && inp.parentElement) {
      var err = inp.parentElement.querySelector('.field-error');
      if (err) err.textContent = msg;
    }
    var input = document.getElementById(id);
    if (input) input.classList.toggle('error', !!msg);
    if (msg) valid = false;
  }

  setErr('evt-title',    title ? '' : 'Titel ist erforderlich.');
  setErr('evt-date',     date  ? '' : 'Datum ist erforderlich.');
  setErr('evt-category', cat   ? '' : 'Kategorie ist erforderlich.');

  if (!valid) return;

  var data = {
    title:       title,
    date:        date,
    time:        document.getElementById('evt-time').value,
    category:    cat,
    location:    document.getElementById('evt-location').value.trim() || 'Sportplatz Griefstedt',
    description: document.getElementById('evt-description').value.trim(),
    highlight:   document.getElementById('evt-highlight').checked,
  };

  var editId = document.getElementById('edit-id').value;
  if (editId) svfUpdateEvent(editId, data);
  else svfAddEvent(data);

  closeModal('modal-event');
  renderTable();
});

/* ---------- Delete Confirm ---------- */
document.getElementById('del-confirm').addEventListener('click', function () {
  if (pendingDeleteId) { svfDeleteEvent(pendingDeleteId); pendingDeleteId = null; }
  closeModal('modal-delete');
  renderTable();
});

/* ---------- Change Password ---------- */
document.getElementById('change-pw-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var pw1 = document.getElementById('new-pw').value;
  var pw2 = document.getElementById('new-pw2').value;
  var err1 = document.getElementById('pw-error');
  var err2 = document.getElementById('pw2-error');
  var formErr = document.getElementById('pw-form-error');
  var formOk  = document.getElementById('pw-form-success');

  err1.textContent = ''; err2.textContent = '';
  hide('pw-form-error'); hide('pw-form-success');

  if (pw1.length < 8) { err1.textContent = 'Mindestens 8 Zeichen.'; return; }
  if (pw1 !== pw2)    { err2.textContent = 'Passwörter stimmen nicht überein.'; return; }

  changePw(pw1).then(function () {
    show('pw-form-success');
    document.getElementById('new-pw').value  = '';
    document.getElementById('new-pw2').value = '';
    setTimeout(function () { closeModal('modal-pw'); }, 1800);
  }).catch(function (err) {
    formErr.textContent = err.message;
    show('pw-form-error');
  });
});

/* ---------- Close buttons ---------- */
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

// Close modal on backdrop click
['modal-event','modal-delete','modal-pw'].forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', function (ev) { if (ev.target === el) closeModal(id); });
});

// Close modal on Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    ['modal-event','modal-delete','modal-pw'].forEach(function (id) { closeModal(id); });
  }
});

/* ---------- Other button wiring ---------- */
document.getElementById('btn-add-event').addEventListener('click', openAddModal);
document.getElementById('btn-logout').addEventListener('click', function () { clearSession(); showScreen('screen-login'); });
document.getElementById('btn-change-pw').addEventListener('click', function () { openModal('modal-pw'); });

var searchEl = document.getElementById('admin-search');
if (searchEl) searchEl.addEventListener('input', renderTable);
var filterEl = document.getElementById('admin-filter-cat');
if (filterEl) filterEl.addEventListener('change', renderTable);

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

/* ---------- Login form ---------- */
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var user = document.getElementById('login-user').value;
  var pw   = document.getElementById('login-pw').value;
  var btn  = document.getElementById('login-btn');
  var errEl = document.getElementById('login-error');

  hide('login-error');
  btn.disabled = true;
  btn.querySelector('.btn-text').hidden = true;
  btn.querySelector('.btn-spinner').hidden = false;

  checkLogin(user, pw).then(function (ok) {
    btn.disabled = false;
    btn.querySelector('.btn-text').hidden = false;
    btn.querySelector('.btn-spinner').hidden = true;

    if (ok) {
      setSession();
      hide('default-pw-hint');
      showScreen('screen-dashboard');
      renderTable();
    } else {
      errEl.textContent = 'Benutzername oder Passwort falsch.';
      show('login-error');
    }
  }).catch(function () {
    btn.disabled = false;
    btn.querySelector('.btn-text').hidden = false;
    btn.querySelector('.btn-spinner').hidden = true;
    errEl.textContent = 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.';
    show('login-error');
  });
});

/* ---------- Init ---------- */
(function init() {
  // Set current year
  document.querySelectorAll('.year-placeholder').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Check if already logged in
  if (isLoggedIn()) {
    showScreen('screen-dashboard');
    renderTable();
  } else {
    showScreen('screen-login');
    // Show hint only if no custom password is set yet
    var hint = document.getElementById('default-pw-hint');
    if (hint) hint.hidden = !!localStorage.getItem(HASH_KEY);
  }
})();
