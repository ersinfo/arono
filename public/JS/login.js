// public/js/login.js
// Attach to login form with id="loginForm"

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = (document.getElementById('login-email')?.value || '').trim();
    const password = document.getElementById('login-password')?.value || '';
    if (!email || !password) return alert('Email और password दोनों भरें।');

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return alert('सही email डालें।');
    if (password.length <6 ) return alert('Password कम से कम 6 अक्षर का होना चाहिए।');

    const payload = { email, password };
    const loginBtn = document.getElementById('loginBtn') || form.querySelector('button[type="submit"]');
    if (loginBtn) { loginBtn.disabled = true; loginBtn.dataset.orig = loginBtn.innerHTML; loginBtn.innerHTML = 'Please wait...'; }

    function isProfileCompleteFromResponse(body) {
      if (!body) return false;
      const u = body.user || {};
      if (u.profileComplete === true || u.profileComplete === 'true') return true;
      if (body.profile && (body.profile.exists || body.profile.id)) return true;
      if (u.profileId) return true;
      if (body.profileExists === true) return true;
      return false;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const status = res.status;
      let body;
      try { body = await res.json(); } catch (err) { body = null; }

      if (!res.ok) {
        const msg = (body && (body.message || (Array.isArray(body.errors) && body.errors.map(e => e.msg).join(', ')))) || `Login failed (status ${status})`;
        return alert(msg);
      }

      const token = body && body.token;
      const user = body && body.user;

      // Persist token + user safe
      if (token) localStorage.setItem('token', token);
      if (user) {
        // Normalize role lowercase
        if (user.role) user.role = String(user.role).toLowerCase();
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('role', user.role || '');

        // Set id keys for both recruiter and candidate so other scripts can read consistent keys
        const incomingId = (user.id || user._id || user.recruiterId || user.userId || '') + '';
        if (user.role === 'recruiter') {
          if (incomingId) localStorage.setItem('recruiterId', incomingId);
          // ensure candidateId removed to avoid confusion
          localStorage.removeItem('candidateId');
        } else if (user.role === 'candidate') {
          if (incomingId) localStorage.setItem('candidateId', incomingId);
          localStorage.removeItem('recruiterId');
        } else {
          // unknown role: remove role-specific ids
          localStorage.removeItem('recruiterId');
          localStorage.removeItem('candidateId');
        }

        // profileComplete flag handling
        if (isProfileCompleteFromResponse(body)) {
          if (user.role === 'recruiter') localStorage.setItem('recruiterProfileComplete', 'true');
          if (user.role === 'candidate') localStorage.setItem('candidateProfileComplete', 'true');
          // also mark on user object
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            u.profileComplete = true;
            localStorage.setItem('user', JSON.stringify(u));
          } catch (e) {}
        } else {
          // ensure stale flag removed
          if (user.role === 'recruiter') localStorage.removeItem('recruiterProfileComplete');
          if (user.role === 'candidate') localStorage.removeItem('candidateProfileComplete');
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            if (u && u.profileComplete) { delete u.profileComplete; localStorage.setItem('user', JSON.stringify(u)); }
          } catch (e) {}
        }
      }

      if (typeof window.updateAuthUI === 'function') window.updateAuthUI();

      // Decide redirect
      (async () => {
        try {
          const storedUser = user || JSON.parse(localStorage.getItem('user') || '{}');
          const roleNow = (storedUser?.role || '').toLowerCase();
          let profileComplete = isProfileCompleteFromResponse(body);

          // If profileComplete not indicated in response, attempt lightweight server probe for recruiter
          if (!profileComplete && roleNow === 'recruiter') {
            const rid = localStorage.getItem('recruiterId') || (storedUser && (storedUser.id || storedUser._id || ''));
            if (rid) {
              try {
                const r = await fetch('/api/recruiter/profile/me', { headers: { 'x-recruiter-id': rid }, cache: 'no-store' });
                if (r.ok) profileComplete = true;
              } catch (e) { /* ignore */ }
            }
          }

          // If candidate and not complete, probe candidate profile endpoint
          if (!profileComplete && roleNow === 'candidate') {
            const cid = localStorage.getItem('candidateId') || (storedUser && (storedUser.id || storedUser._id || ''));
            if (cid) {
              try {
                const r = await fetch('/api/candidate/profile/me', { headers: { 'x-candidate-id': cid }, cache: 'no-store' });
                if (r.ok) profileComplete = true;
              } catch (e) { /* ignore */ }
            }
          }

          // Redirect rules
          if (roleNow === 'recruiter') {
            window.location.href = profileComplete ? '/recruiter-profile-view.html' : '/recruiter-profile.html';
            return;
          }
          if (roleNow === 'candidate') {
            window.location.href = profileComplete ? '/candidate-profile-view.html' : '/candidate-profile.html';
            return;
          }

          // fallback: respect next param if present, otherwise index
          const next = new URLSearchParams(location.search).get('next') || '/index.html';
          window.location.href = next;
        } catch (err) {
          console.error('redirectAfterLogin error', err);
          window.location.href = '/index.html';
        }
      })();

    } catch (err) {
      console.error('Login error:', err);
      alert('कुछ गलती हुई है — console देखें।');
    } finally {
      if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = loginBtn.dataset.orig || 'Login'; }
    }
  });
});

