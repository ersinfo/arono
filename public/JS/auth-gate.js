// public/js/auth-gate.js
// Unified auth guard for recruiter + candidate flows.
// Defensive. Non-blocking on network errors.

(() => {
  const DEBUG = false;
  const log = (...a) => DEBUG && console.log('[auth-gate]', ...a);

  // Paths
  const RECRUITER_FORM = '/recruiter-profile.html';
  const RECRUITER_VIEW = '/recruiter-profile-view.html';
  const RECRUITER_PROTECTED = ['/post-job.html', '/post-internship.html'];

  const CANDIDATE_FORM = '/candidate-profile.html';
  const CANDIDATE_VIEW = '/candidate-profile-view.html';
  const CANDIDATE_PROTECTED = ['/apply-job.html', '/apply-internship.html'];

  const normalize = p => (p || '').replace(/\/+$/, '') || '/';
  const path = normalize(location.pathname);
  const params = new URLSearchParams(location.search);
  const isEditMode = params.get('edit') === '1' || params.get('edit') === 'true' || params.has('edit');

  // Local flags & ids
  const isLoggedIn = ((localStorage.getItem('isLoggedIn') || '').toLowerCase() === 'true');
  const storedUserRaw = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; } })();
  const role = (localStorage.getItem('role') || (storedUserRaw && storedUserRaw.role) || '').toLowerCase();
  const recruiterId = localStorage.getItem('recruiterId') || (storedUserRaw && (storedUserRaw.id || storedUserRaw._id || storedUserRaw.recruiterId)) || '';
  const candidateId = localStorage.getItem('candidateId') || (storedUserRaw && (storedUserRaw.id || storedUserRaw._id || storedUserRaw.candidateId)) || '';

  const isOnRecruiterForm = path === RECRUITER_FORM;
  const isOnCandidateForm = path === CANDIDATE_FORM;
  const isRecruiterProtected = RECRUITER_PROTECTED.includes(path);
  const isCandidateProtected = CANDIDATE_PROTECTED.includes(path);

  function safeRedirect(url) {
    try {
      const u = new URL(url, location.origin);
      const target = (u.pathname || '') + (u.search || '');
      if ((location.pathname + location.search) !== target) location.href = url;
    } catch (e) {
      if (location.href !== url) location.href = url;
    }
  }

  // If not logged in and accessing protected/profile pages -> force login
  if (!isLoggedIn && (isOnRecruiterForm || isOnCandidateForm || isRecruiterProtected || isCandidateProtected)) {
    log('not logged in -> redirect to login');
    safeRedirect(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
    return;
  }

  // Helper: server status check
  async function fetchProfileStatus(kind, id) {
    if (!id) return false;
    try {
      const header = kind === 'recruiter' ? 'x-recruiter-id' : 'x-candidate-id';
      const res = await fetch(`/api/${kind}/profile/status`, { headers: { [header]: id }, cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 401) {
          safeRedirect(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
          return false;
        }
        throw new Error('status ' + res.status);
      }
      const json = await res.json();
      return !!(json && (json.profileComplete || json.profile_complete));
    } catch (err) {
      console.warn('[auth-gate] status check failed', kind, err);
      return null; // null => error (be permissive)
    }
  }

  // Candidate flow
  if (role === 'candidate') {
    log('role=candidate');

    if (isOnCandidateForm || path === CANDIDATE_VIEW) {
      if (isOnCandidateForm && !isEditMode) {
        const cached = (localStorage.getItem('candidateProfileComplete') || '').toLowerCase();
        if (cached === 'true') { safeRedirect(CANDIDATE_VIEW); return; }

        if (!candidateId) { safeRedirect(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`); return; }

        fetchProfileStatus('candidate', candidateId).then(status => {
          if (status === true) {
            localStorage.setItem('candidateProfileComplete', 'true');
            safeRedirect(CANDIDATE_VIEW);
          }
        });
      }
      return;
    }

    const cachedFlag = (localStorage.getItem('candidateProfileComplete') || '').toLowerCase();
    if (cachedFlag === 'true') return;

    if (!candidateId) { safeRedirect(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`); return; }

    fetchProfileStatus('candidate', candidateId).then(status => {
      if (status === false) safeRedirect(CANDIDATE_FORM);
      else if (status === true) localStorage.setItem('candidateProfileComplete', 'true');
      // if status === null -> network error -> permissive
    });

    return;
  }

  // Recruiter flow
  if (role === 'recruiter') {
    log('role=recruiter');

    if (isOnRecruiterForm || path === RECRUITER_VIEW) {
      if (isOnRecruiterForm && !isEditMode) {
        const cached = (localStorage.getItem('recruiterProfileComplete') || '').toLowerCase();
        if (cached === 'true') { safeRedirect(RECRUITER_VIEW); return; }

        if (!recruiterId) { safeRedirect(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`); return; }

        fetchProfileStatus('recruiter', recruiterId).then(status => {
          if (status === true) {
            localStorage.setItem('recruiterProfileComplete', 'true');
            safeRedirect(RECRUITER_VIEW);
          }
        });
      }
      return;
    }

    const cachedRec = (localStorage.getItem('recruiterProfileComplete') || '').toLowerCase();
    if (cachedRec === 'true') return;

    if (!recruiterId) { safeRedirect(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`); return; }

    fetchProfileStatus('recruiter', recruiterId).then(status => {
      if (status === false) safeRedirect(RECRUITER_FORM);
      else if (status === true) localStorage.setItem('recruiterProfileComplete', 'true');
    });

    return;
  }

  // other roles or no role -> allow
  log('no candidate/recruiter role -> allow');
})();
