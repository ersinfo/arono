// /public/js/job.js
(() => {
  const list = document.getElementById('jobsList');
  const empty = document.getElementById('emptyState');
  const detail = document.getElementById('jobDetail');
  const postBtn = document.getElementById('postJobBtn'); // page par Post Job button

  // Post button: ensure recruiter/profile
  postBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const recruiterId = localStorage.getItem('recruiterId') || localStorage.getItem('userId');
    if (!recruiterId) {
      location.href = '/login.html?next=' + encodeURIComponent('/post-job.html');
      return;
    }
    try {
      const r = await fetch('/api/recruiter/profile/status', {
        headers: { 'x-recruiter-id': recruiterId }, cache: 'no-store'
      });
      const { profileComplete } = r.ok ? await r.json() : { profileComplete: false };
      if (!profileComplete) return location.href = '/recruiter-profile.html?edit=1';
      location.href = '/post-job.html';
    } catch {
      location.href = '/post-job.html';
    }
  });

  // Load jobs
  loadJobs();

  async function loadJobs() {
    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      const data = await res.json();
      const jobs = data.jobs || [];
      list.innerHTML = '';
      if (jobs.length === 0) {
        empty.classList.remove('d-none');
        return;
      }
      empty.classList.add('d-none');

      jobs.forEach(j => {
        const el = document.createElement('div');
        el.className = 'card shadow-sm';
        el.innerHTML = `
          <div class="card-body">
            <h5 class="mb-1">${esc(j.title)} — <small class="text-muted">${esc(j.company)}</small></h5>
            <div class="mb-2">${esc(j.location)} ${j.jobType ? '• ' + esc(j.jobType) : ''}</div>
            ${j.salaryRange?.min || j.salaryRange?.max ? `
              <div class="mb-2">Salary: 
                ${j.salaryRange.min ? '₹' + esc(j.salaryRange.min) : ''} 
                ${j.salaryRange.min && j.salaryRange.max ? ' - ' : ''} 
                ${j.salaryRange.max ? '₹' + esc(j.salaryRange.max) : ''}
              </div>` : ''
            }
            <p class="mb-0">${esc(j.description)}</p>
          </div>
        `;
        list.appendChild(el);
      });

      // show toast if redirected after posting
      if (new URLSearchParams(location.search).get('posted') === '1') {
        toast('Job published successfully!', 'success');
        history.replaceState({}, '', '/jobs'); // clean query
      }
    } catch (e) {
      empty.textContent = 'Failed to load jobs.';
      empty.classList.remove('d-none');
    }
  }

  function esc(s='') { return String(s).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
  function toast(msg, type='info'){
    let h = document.getElementById('toast-holder');
    if(!h){ h=document.createElement('div'); h.id='toast-holder'; h.style.position='fixed'; h.style.right='16px'; h.style.bottom='16px'; h.style.zIndex='1060'; document.body.appendChild(h); }
    const el = document.createElement('div'); el.className = `alert alert-${type}`; el.textContent = msg; h.appendChild(el); setTimeout(()=>el.remove(), 2200);
  }
})();
