// public/JS/post-job.js
(function () {
  const form = document.getElementById('postJobForm');
  const publishBtn = document.getElementById('publishBtn');
  const msgEl = document.getElementById('formMsg');

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function setMsg(text, kind = 'muted') {
    if (!msgEl) return;
    msgEl.textContent = text;
    // reset class then set
    msgEl.className = 'small text-' + kind;
  }

  // safe JSON parse helper for responses that may not be JSON
  async function safeJson(res) {
    const txt = await res.text().catch(() => '');
    try {
      return txt ? JSON.parse(txt) : null;
    } catch (e) {
      return { _raw: txt };
    }
  }

  if (!form) {
    console.warn('postJobForm not found on this page.');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    setMsg('');
    form.classList.remove('was-validated');

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    // build payload
    const payload = {
      title: document.getElementById('title').value.trim(),
      company: document.getElementById('company').value.trim(),
      location: document.getElementById('location').value.trim(),
      jobType: document.getElementById('jobType').value,
      description: document.getElementById('description').value.trim(),
      isActive: document.getElementById('isActive').checked
    };

    // salary
    const salaryMin = document.getElementById('salaryMin').value;
    const salaryMax = document.getElementById('salaryMax').value;
    if (salaryMin || salaryMax) {
      payload.salaryRange = {};
      if (salaryMin !== '') payload.salaryRange.min = Number(salaryMin);
      if (salaryMax !== '') payload.salaryRange.max = Number(salaryMax);
    }

    // requirements: comma separated -> array
    const reqs = document.getElementById('requirements').value;
    if (reqs) payload.requirements = reqs.split(',').map(s => s.trim()).filter(Boolean);

    // application deadline: send ISO date string (if valid)
    const deadline = document.getElementById('applicationDeadline').value;
    if (deadline) {
      const d = new Date(deadline);
      if (!Number.isNaN(d.getTime())) payload.applicationDeadline = d.toISOString();
    }

    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing...';

    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res);

      if (!res.ok) {
        // prefer server-sent error shape: { error: '...' } or { message: '...' }
        const errMsg = (data && (data.error || data.message)) || `Failed to post job (${res.status})`;
        throw new Error(errMsg);
      }

      setMsg('Job posted successfully.', 'success');

      // redirect after small delay so user sees message
      setTimeout(() => {
        window.location.href = '/jobs';
      }, 600);
    } catch (err) {
      setMsg(err.message || 'Error posting job', 'danger');
      console.error('post job error:', err);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish Job';
    }
  });
})();
