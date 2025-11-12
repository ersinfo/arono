// /JS/site-header.js
(function () {
  'use strict';

  function getStoredUser() {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return null;
    }
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&<>"'`=\/]/g, function (s) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      }[s];
    });
  }

  function createLoginButton() {
    return `<a href="/login.html" class="btn btn-outline-primary rounded-pill" id="loginBtnHeader">Login</a>`;
  }

  function createUserButton(user) {
    const first = user && (user.firstName || user.name) ? (user.firstName || user.name) : '';
    const last = user && user.lastName ? user.lastName : '';
    const email = user && user.email ? user.email : '';
    const displayName = (first + (last ? ' ' + last : '')).trim() || email || 'User';
    const safeName = escapeHtml(displayName);

    const personSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.468 12.37C12.758 11.226 11.485 10.5 10 10.5s-2.758.726-3.468 1.87A6.987 6.987 0 0 1 2 8a6.99 6.99 0 1 1 11.468 4.37z"/>
        <path d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
      </svg>
    `;

    return `
      <div class="d-flex align-items-center">
        <button type="button" class="btn btn-primary rounded-pill d-flex align-items-center" id="accountBtn" data-bs-toggle="offcanvas" data-bs-target="#accountOffcanvas" aria-controls="accountOffcanvas" aria-expanded="false" aria-label="Open account menu">
          <span class="me-2">${safeName}</span>
          ${personSvg}
        </button>
      </div>
    `;
  }

  function findNavbarLoginArea() {
    let selectors = [
      '#navbar-login-area',
      '.navbar-login-area',
      '.navbar .navbar-nav .nav-item:last-child',
      '.navbar .container-fluid',
      '.navbar'
    ];
    for (let sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function ensureWrapper(parent) {
    if (!parent) return null;
    let existing = document.getElementById('navbar-login-area');
    if (existing) return existing;
    const wrapper = document.createElement('div');
    wrapper.id = 'navbar-login-area';
    wrapper.className = 'ms-auto d-flex align-items-center';
    try { parent.appendChild(wrapper); } catch (e) { console.warn('Could not append navbar login wrapper:', e); return null; }
    return wrapper;
  }

  // doLogout must exist and behave same as before
  function doLogout() {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.setItem('isLoggedIn', 'false');
      updateAuthUI();
      try { window.location.href = '/index.html'; } catch (e) {}
    } catch (e) {
      console.error('logout error', e);
    }
  }

  function updateAuthUI() {
    try {
      const user = getStoredUser();

      let area = document.getElementById('navbar-login-area') || document.querySelector('.navbar-login-area');
      if (!area) {
        const navbarContainer = document.querySelector('.navbar .container-fluid') || document.querySelector('.navbar');
        area = ensureWrapper(navbarContainer);
      }

      if (!area) {
        console.warn('updateAuthUI: could not find navbar area to render login info.');
        return;
      }

      if (user) {
        area.innerHTML = createUserButton(user);

        // set offcanvas displayed name if present
        const offcanvasName = document.getElementById('offcanvasUserName');
        if (offcanvasName) {
          const first = user.firstName || user.name || '';
          const last = user.lastName || '';
          const email = user.email || '';
          const displayName = (first + (last ? ' ' + last : '')).trim() || email || 'User';
          offcanvasName.textContent = displayName;
        }

        // --- NEW: set profile link based on role and ensure it doesn't have leftover handlers ---
        try {
          const profileLink = (user.role === 'recruiter') ? '/recruiter-profile-view.html'
                             : (user.role === 'candidate') ? '/candidate-profile-view.html' : '/index.html';

          const profileEl = document.getElementById('offcanvasProfileLink');
          if (profileEl) {
            // replace with cloned node to remove any previous listeners then set href/text
            const clean = profileEl.cloneNode(true);
            clean.id = 'offcanvasProfileLink';
            clean.href = profileLink;
            clean.textContent = 'My Profile';
            profileEl.parentNode.replaceChild(clean, profileEl);
          }
        } catch (e) {
          console.warn('profile link bind failed', e);
        }

        // --- Rebind logout safely AFTER we updated DOM ---
        try {
          const offLogoutOld = document.getElementById('offcanvasLogoutBtn');
          if (offLogoutOld) {
            const fresh = offLogoutOld.cloneNode(true);
            offLogoutOld.parentNode.replaceChild(fresh, offLogoutOld);
            const freshLogout = document.getElementById('offcanvasLogoutBtn');
            if (freshLogout) {
              freshLogout.addEventListener('click', function (ev) {
                ev.preventDefault();
                doLogout();
              });
            }
          }
        } catch (e) {
          console.warn('logout bind failed', e);
        }

        // account button hook (no-op if using bootstrap offcanvas)
        const acct = document.getElementById('accountBtn');
        if (acct) {
          acct.addEventListener('click', function () {});
        }

      } else {
        area.innerHTML = createLoginButton();
        const lbtn = document.getElementById('loginBtnHeader');
        if (lbtn) {
          lbtn.addEventListener('click', function (e) { /* allow default */ });
        }
      }
    } catch (err) {
      console.error('updateAuthUI failed', err);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', updateAuthUI);
  window.addEventListener('storage', function (e) {
    if (['user', 'token', 'isLoggedIn', 'role', 'candidateId', 'recruiterId'].includes(e.key)) updateAuthUI();
  });
  window.addEventListener('load', function () {
    try { updateAuthUI(); } catch (e) {}
    setTimeout(function () { try { updateAuthUI(); } catch (e) {} }, 120);
  });

  window.updateAuthUI = updateAuthUI;
  window.aronLogout = doLogout;

})();
