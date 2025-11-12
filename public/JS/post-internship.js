// public/JS/post-internship.js
(function () {
  // run after DOM ready so we don't get null elements
  document.addEventListener('DOMContentLoaded', () => {
    // try a few possible form IDs (fallbacks)
    const form =
      document.getElementById('postInternshipForm') ||
      document.getElementById('postJobForm') ||
      document.getElementById('internshipForm');

    // publish button fallbacks
    const publishBtn =
      document.getElementById('publishInternshipBtn') ||
      document.getElementById('publishBtn');

    // message element fallback
    const msgEl =
      document.getElementById('internFormMsg') ||
      document.getElementById('formMsg') ||
      document.getElementById('postFormMsg');

    function getToken() {
      return localStorage.getItem('token') || '';
    }

    function setMsg(text, kind = 'muted') {
      if (!msgEl) {
        // fallback: console
        if (text) console.log(`[post-internship msg ${kind}]`, text);
        return;
      }
      msgEl.textContent = text || '';
      msgEl.className = 'small text-' + kind;
    }

    function safeJson(res) {
      return res.text()
        .then(txt => {
          try {
            return txt ? JSON.parse(txt) : null;
          } catch (e) {
            return { _raw: txt };
          }
        })
        .catch(() => null);
    }

    if (!form) {
      console.warn('post-internship: no form found. Looked for postInternshipForm, postJobForm, internshipForm');
      return;
    }

    // helper to read element with multiple possible ids/names
    const el = (ids) => {
      if (!ids) return null;
      if (!Array.isArray(ids)) ids = [ids];
      for (const id of ids) {
        const e = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (e) return e;
      }
      return null;
    };

    // Debug: print missing expected elements
    const expected = [
      ['postInternshipForm'],
      ['title', 'intTitle'],
      ['company', 'intCompany'],
      ['location', 'intLocation'],
      ['jobType', 'intType'],
      ['description', 'intDescription'],
      ['isActive', 'intIsActive'],
      ['salaryMin', 'intSalaryMin'],
      ['salaryMax', 'intSalaryMax'],
      ['requirements', 'intRequirements'],
      ['applicationDeadline', 'intApplicationDeadline'],
      ['duration', 'intDuration']
    ];
    const missing = [];
    for (const ids of expected) {
      if (!el(ids)) missing.push(ids);
    }
    if (missing.length) {
      console.warn('post-internship: some expected inputs not found (first matching id/name tried for each):', missing);
      // optionally show a visible note
      const noteHolder = msgEl || form;
      if (noteHolder && !noteHolder.querySelector('.post-internship-warning')) {
        const n = document.createElement('div');
        n.className = 'post-internship-warning small text-muted';
        n.style.marginTop = '6px';
        n.textContent = 'Note: if form submission fails, check input element IDs (see console).';
        noteHolder.appendChild(n);
      }
    }

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      setMsg('');
      // remove bootstrap invalid state if any
      form.classList.remove('was-validated');

      // Basic validity check (HTML5)
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      // Read values defensively (support both id and name patterns)
      const titleEl = el(['title', 'intTitle']);
      const companyEl = el(['company', 'intCompany']);
      const locationEl = el(['location', 'intLocation']);
      const typeEl = el(['jobType', 'intType', 'internshipType']);
      const descEl = el(['description', 'intDescription']);
      const isActiveEl = el(['isActive', 'intIsActive']);
      const salaryMinEl = el(['salaryMin', 'intSalaryMin']);
      const salaryMaxEl = el(['salaryMax', 'intSalaryMax']);
      const reqsEl = el(['requirements', 'intRequirements']);
      const deadlineEl = el(['applicationDeadline', 'intApplicationDeadline']);
      const durationEl = el(['duration', 'intDuration']);

      // critical elements check
      if (!titleEl || !companyEl || !locationEl || !descEl) {
        console.error('post-internship: required input missing', {
          titleEl, companyEl, locationEl, descEl
        });
        setMsg('Form is misconfigured (missing required fields). Check console.', 'danger');
        return;
      }

      // Build payload
      const payload = {
        title: String(titleEl.value || '').trim(),
        company: String(companyEl.value || '').trim(),
        location: String(locationEl.value || '').trim(),
        internshipType: String((typeEl && typeEl.value) || 'Internship'),
        description: String(descEl.value || '').trim(),
        isActive: Boolean(isActiveEl ? (isActiveEl.checked ?? isActiveEl.value) : true),
        createdAt: new Date()
      };

      // Salary range
      const salaryMin = salaryMinEl ? salaryMinEl.value : '';
      const salaryMax = salaryMaxEl ? salaryMaxEl.value : '';
      if (salaryMin || salaryMax) {
        payload.salaryRange = {};
        if (salaryMin !== '') payload.salaryRange.min = Number(salaryMin);
        if (salaryMax !== '') payload.salaryRange.max = Number(salaryMax);
      }

      // requirements
      const reqs = reqsEl ? (reqsEl.value || '') : '';
      if (reqs) {
        payload.requirements = reqs.split(',').map(s => s.trim()).filter(Boolean);
      }

      // deadline
      const deadline = deadlineEl ? (deadlineEl.value || '') : '';
      if (deadline) {
        const d = new Date(deadline);
        if (!Number.isNaN(d.getTime())) payload.applicationDeadline = d.toISOString();
      }

      // duration
      if (durationEl && durationEl.value) payload.duration = String(durationEl.value).trim();

      // disable button
      if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing...';
      }

      try {
        const token = getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch('/api/internships', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await safeJson(res);
        if (!res.ok) {
          const err = (data && (data.error || data.message)) || `Failed to post internship (${res.status})`;
          throw new Error(err);
        }

        setMsg('Internship posted successfully.', 'success');
        // redirect to list after small delay so user sees the message
        setTimeout(() => window.location.href = '/see-internship.html', 700);
      } catch (err) {
        console.error('post-internship error', err);
        setMsg(err.message || 'Error posting internship', 'danger');
      } finally {
        if (publishBtn) {
          publishBtn.disabled = false;
          publishBtn.textContent = publishBtn.getAttribute('data-default-text') || 'Publish Internship';
        }
      }
    }); // end submit
  }); // end DOMContentLoaded
})();
