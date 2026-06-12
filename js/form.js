'use strict';

/* ---------- Membership Form – posts to /api/membership ---------- */
(function () {
  const form      = document.getElementById('membership-form');
  const success   = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  /* ---- Guardians section for minors ---- */
  const dobInput        = document.getElementById('geburtsdatum');
  const guardianSection = document.getElementById('erziehungsberechtigter-fieldset');

  function isMinor(dob) {
    if (!dob) return false;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const mo = today.getMonth() - birth.getMonth();
    if (mo < 0 || (mo === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  }

  if (dobInput && guardianSection) {
    dobInput.addEventListener('change', () => {
      const minor = isMinor(dobInput.value);
      guardianSection.style.display = minor ? '' : 'none';
      guardianSection.querySelectorAll('input').forEach(el => { el.required = minor; });
    });
  }

  /* ---- Set minimum entry date ---- */
  const eintrittInput = document.getElementById('eintrittsdatum');
  if (eintrittInput && !eintrittInput.value) {
    eintrittInput.min   = new Date().toISOString().split('T')[0];
    eintrittInput.value = new Date().toISOString().split('T')[0];
  }

  /* ---- IBAN formatter ---- */
  const ibanInput = document.getElementById('iban');
  if (ibanInput) {
    ibanInput.addEventListener('input', () => {
      let v = ibanInput.value.replace(/\s/g, '').toUpperCase();
      v = v.replace(/(.{4})/g, '$1 ').trim();
      ibanInput.value = v;
    });
  }

  /* ---- Field validation helpers ---- */
  function showError(input, msg) {
    input.classList.add('error');
    input.classList.remove('valid');
    const el = input.parentElement.querySelector('.field-error');
    if (el) el.textContent = msg;
  }
  function clearError(input) {
    input.classList.remove('error');
    const el = input.parentElement.querySelector('.field-error');
    if (el) el.textContent = '';
  }
  function markValid(input) {
    input.classList.remove('error');
    input.classList.add('valid');
    const el = input.parentElement.querySelector('.field-error');
    if (el) el.textContent = '';
  }

  function validateField(input) {
    const val = input.value.trim();
    if (input.required && !val) { showError(input, 'Dieses Feld ist erforderlich.'); return false; }
    if (input.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showError(input, 'Gültige E-Mail-Adresse erforderlich.'); return false;
    }
    if (input.id === 'plz' && val && !/^\d{5}$/.test(val)) {
      showError(input, 'Gültige 5-stellige PLZ erforderlich.'); return false;
    }
    if (input.id === 'iban' && val) {
      const raw = val.replace(/\s/g, '');
      if (raw.length < 15 || !/^[A-Z]{2}\d{2}/.test(raw)) {
        showError(input, 'Gültige IBAN erforderlich.'); return false;
      }
    }
    if (input.id === 'geburtsdatum' && val && new Date(val) >= new Date()) {
      showError(input, 'Geburtsdatum muss in der Vergangenheit liegen.'); return false;
    }
    if (input.id === 'eintrittsdatum' && val) {
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(val) < today) { showError(input, 'Eintrittsdatum darf nicht in der Vergangenheit liegen.'); return false; }
    }
    if (val) markValid(input); else clearError(input);
    return true;
  }

  form.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
    input.addEventListener('blur',  () => validateField(input));
    input.addEventListener('input', () => { if (input.classList.contains('error')) validateField(input); });
  });

  function validateConsents() {
    let valid = true;
    [{ id: 'sepa-consent',       errId: 'sepa-error',       msg: 'Bitte stimmen Sie dem SEPA-Mandat zu.' },
     { id: 'datenschutz-consent',errId: 'datenschutz-error',msg: 'Bitte stimmen Sie der Datenschutzerklärung zu.' },
     { id: 'satzung-consent',    errId: 'satzung-error',    msg: 'Bitte erkennen Sie die Vereinssatzung an.' }]
    .forEach(({ id, errId, msg }) => {
      const cb  = document.getElementById(id);
      const err = document.getElementById(errId);
      if (!cb || !err) return;
      if (!cb.checked) { err.textContent = msg; valid = false; }
      else err.textContent = '';
    });
    return valid;
  }

  function validateForm() {
    let valid = true;
    form.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
      if (input.closest('[style*="none"]')) return;
      if (!validateField(input)) valid = false;
    });
    if (!validateConsents()) valid = false;
    return valid;
  }

  /* ---- Submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      const firstErr = form.querySelector('.error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').hidden    = true;
    submitBtn.querySelector('.btn-spinner').hidden = false;

    /* Collect form data */
    const abteilungen = Array.from(
      form.querySelectorAll('input[name="abteilung"]:checked')
    ).map(cb => cb.value);

    const payload = {
      anrede:              document.getElementById('anrede').value,
      vorname:             document.getElementById('vorname').value.trim(),
      nachname:            document.getElementById('nachname').value.trim(),
      geburtsdatum:        document.getElementById('geburtsdatum').value,
      strasse:             document.getElementById('strasse').value.trim(),
      plz:                 document.getElementById('plz').value.trim(),
      ort:                 document.getElementById('ort').value.trim(),
      telefon:             document.getElementById('telefon').value.trim(),
      email:               document.getElementById('email').value.trim(),
      beitrag:             document.getElementById('beitrag').value,
      eintrittsdatum:      document.getElementById('eintrittsdatum').value,
      abteilungen,
      kontoinhaber:        document.getElementById('kontoinhaber').value.trim(),
      iban:                document.getElementById('iban').value,
      bic:                 document.getElementById('bic').value.trim(),
      bank:                document.getElementById('bank').value.trim(),
      sepa_consent:        document.getElementById('sepa-consent').checked,
      datenschutz_consent: document.getElementById('datenschutz-consent').checked,
      satzung_consent:     document.getElementById('satzung-consent').checked,
      newsletter_consent:  document.getElementById('newsletter-consent').checked,
    };

    try {
      const res = await fetch('/api/membership', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        const nameEl = document.getElementById('success-name');
        if (nameEl) nameEl.textContent = payload.vorname + ' ' + payload.nachname;
        form.hidden    = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').hidden    = false;
        submitBtn.querySelector('.btn-spinner').hidden = true;
        alert('Fehler: ' + (data.error || 'Bitte erneut versuchen.'));
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').hidden    = false;
      submitBtn.querySelector('.btn-spinner').hidden = true;
      alert('Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.');
    }
  });
})();
