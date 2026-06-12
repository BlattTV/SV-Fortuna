'use strict';

/* ---------- Membership Form ---------- */
(function () {
  const form      = document.getElementById('membership-form');
  const success   = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  /* ---- Guardians section for minors ---- */
  const dobInput = document.getElementById('geburtsdatum');
  const guardianSection = document.getElementById('erziehungsberechtigter-fieldset');

  function isMinor(dob) {
    if (!dob) return false;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  }

  if (dobInput && guardianSection) {
    dobInput.addEventListener('change', () => {
      const minor = isMinor(dobInput.value);
      guardianSection.style.display = minor ? '' : 'none';
      guardianSection.querySelectorAll('input').forEach(el => {
        el.required = minor;
      });
    });
  }

  /* ---- Set minimum date for entry ---- */
  const eintrittInput = document.getElementById('eintrittsdatum');
  if (eintrittInput) {
    const today = new Date().toISOString().split('T')[0];
    eintrittInput.min = today;
    eintrittInput.value = today;
  }

  /* ---- IBAN formatter ---- */
  const ibanInput = document.getElementById('iban');
  if (ibanInput) {
    ibanInput.addEventListener('input', () => {
      let val = ibanInput.value.replace(/\s/g, '').toUpperCase();
      val = val.replace(/(.{4})/g, '$1 ').trim();
      ibanInput.value = val;
    });
  }

  /* ---- Field validation ---- */
  function showError(input, msg) {
    input.classList.add('error');
    input.classList.remove('valid');
    const errEl = input.parentElement.querySelector('.field-error');
    if (errEl) errEl.textContent = msg;
  }

  function clearError(input) {
    input.classList.remove('error');
    const errEl = input.parentElement.querySelector('.field-error');
    if (errEl) errEl.textContent = '';
  }

  function markValid(input) {
    input.classList.remove('error');
    input.classList.add('valid');
    const errEl = input.parentElement.querySelector('.field-error');
    if (errEl) errEl.textContent = '';
  }

  function validateField(input) {
    const val = input.value.trim();

    if (input.required && !val) {
      showError(input, 'Dieses Feld ist erforderlich.');
      return false;
    }

    if (input.type === 'email' && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showError(input, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
        return false;
      }
    }

    if (input.id === 'plz' && val) {
      if (!/^\d{5}$/.test(val)) {
        showError(input, 'Bitte geben Sie eine gültige 5-stellige PLZ ein.');
        return false;
      }
    }

    if (input.id === 'iban' && val) {
      const raw = val.replace(/\s/g, '');
      if (raw.length < 15 || raw.length > 34 || !/^[A-Z]{2}\d{2}/.test(raw)) {
        showError(input, 'Bitte geben Sie eine gültige IBAN ein.');
        return false;
      }
    }

    if (input.id === 'geburtsdatum' && val) {
      const birth = new Date(val);
      const today = new Date();
      if (birth >= today) {
        showError(input, 'Das Geburtsdatum muss in der Vergangenheit liegen.');
        return false;
      }
    }

    if (input.id === 'eintrittsdatum' && val) {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        showError(input, 'Das Eintrittsdatum kann nicht in der Vergangenheit liegen.');
        return false;
      }
    }

    if (val) markValid(input);
    else clearError(input);
    return true;
  }

  /* ---- Live validation on blur ---- */
  form.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(input);
    });
  });

  /* ---- Consent validation ---- */
  function validateConsents() {
    let valid = true;
    [
      { id: 'sepa-consent', errId: 'sepa-error', msg: 'Bitte stimmen Sie dem SEPA-Lastschriftmandat zu.' },
      { id: 'datenschutz-consent', errId: 'datenschutz-error', msg: 'Bitte stimmen Sie der Datenschutzerklärung zu.' },
      { id: 'satzung-consent', errId: 'satzung-error', msg: 'Bitte erkennen Sie die Vereinssatzung an.' },
    ].forEach(({ id, errId, msg }) => {
      const cb  = document.getElementById(id);
      const err = document.getElementById(errId);
      if (!cb || !err) return;
      if (!cb.checked) {
        err.textContent = msg;
        valid = false;
      } else {
        err.textContent = '';
      }
    });
    return valid;
  }

  /* ---- Full form validation ---- */
  function validateForm() {
    let valid = true;

    form.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
      if (input.closest('fieldset[style*="none"]')) return;
      if (!validateField(input)) valid = false;
    });

    if (!validateConsents()) valid = false;

    return valid;
  }

  /* ---- Submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstError = form.querySelector('.error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* Show loading state */
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').hidden = true;
    submitBtn.querySelector('.btn-spinner').hidden = false;

    /* Simulate network request (replace with real API call) */
    await new Promise(r => setTimeout(r, 1500));

    /* Show success */
    const vornameVal = document.getElementById('vorname').value.trim();
    const nachnameVal = document.getElementById('nachname').value.trim();
    const successName = document.getElementById('success-name');
    if (successName) successName.textContent = `${vornameVal} ${nachnameVal}`;

    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
