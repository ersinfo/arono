// /public/js/recruiter-profile-view.js (safe, null-checked)
(function () {
  const recruiterId = localStorage.getItem('recruiterId') || localStorage.getItem('userId');
  if (!recruiterId) {
    // Not logged in → send to login
    location.href = '/login.html';
    return;
  }

  // Elements (may be null if HTML missing some nodes)
  const els = {
    status: document.getElementById('profileStatus'),
    logo: document.getElementById('companyLogo'),
    name: document.getElementById('companyName'),
    website: document.getElementById('companyWebsite'),
    industry: document.getElementById('industryType'),
    size: document.getElementById('companySize'),
    hq: document.getElementById('headquarters'),
    desc: document.getElementById('companyDescription'),
    desig: document.getElementById('designation'),
    dept: document.getElementById('department'),
    linkedin: document.getElementById('linkedin'),
    govId: document.getElementById('govtBusinessId'),
    updatedAt: document.getElementById('updatedAt'),
    empty: document.getElementById('emptyState')
  };

  // helper: safely remove a class if element exists
  function safeRemoveClass(el, classname) {
    if (!el) {
      console.warn('safeRemoveClass: element not found for', classname);
      return;
    }
    if (el.classList) el.classList.remove(classname);
  }

  // helper: safely add a class
  function safeAddClass(el, classname) {
    if (!el) return;
    if (el.classList) el.classList.add(classname);
  }

  // safe setText: if element missing, skip
  function setText(el, val) {
    if (!el) return;
    try {
      el.textContent = (val && String(val).trim()) || '—';
    } catch (e) {
      console.warn('setText failed for element', el, e);
    }
  }

  // safe set attribute or fallback text
  function setAttrFallback(el, attr, val, fallbackText) {
    if (!el) return;
    try {
      if (val) {
        el.setAttribute(attr, val);
        el.textContent = (val && String(val).replace(/^https?:\/\//, '')) || val;
      } else {
        el.removeAttribute(attr);
        el.textContent = fallbackText || '—';
      }
    } catch (e) {
      console.warn('setAttrFallback failed for', el, e);
    }
  }

  // Try your status endpoint first (optional)
  fetch('/api/recruiter/profile/status', {
    headers: { 'x-recruiter-id': recruiterId },
    cache: 'no-store'
  })
  .then(r => r.ok ? r.json() : { profileComplete: false })
  .then(({ profileComplete }) => {
    if (!profileComplete) {
      // profile incomplete; still attempt to load data (in case partial exists)
      loadProfile(true);
    } else {
      loadProfile(false);
    }
  })
  .catch(() => loadProfile(true));

  function loadProfile(incomplete) {
    fetch('/api/recruiter/profile/me', {
      headers: { 'x-recruiter-id': recruiterId },
      cache: 'no-store'
    })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(profile => render(profile, incomplete))
    .catch((err) => {
      // show empty state if nothing — safely
      safeRemoveClass(els.empty, 'd-none');
      setStatus(false);
      console.warn('loadProfile failed or no profile:', err);
    });
  }

  function render(p, incomplete) {
    if (!p || typeof p !== 'object') {
      safeRemoveClass(els.empty, 'd-none');
      setStatus(false);
      return;
    }

    setStatus(!incomplete);

    // Company
    setText(els.name, p.companyName);
    setText(els.industry, p.industryType);
    setText(els.size, p.companySize);
    setText(els.hq, p.headquarters);
    setText(els.desc, p.companyDescription);

    // Website (safe)
    if (els.website) {
      try {
        if (p.companyWebsite) {
          els.website.href = p.companyWebsite;
          els.website.textContent = p.companyWebsite.replace(/^https?:\/\//, '');
        } else {
          els.website.removeAttribute && els.website.removeAttribute('href');
          els.website.textContent = '—';
        }
      } catch (e) {
        console.warn('Error setting website', e);
      }
    }

    // Logo (safe)
    if (els.logo) {
      try {
        if (p.companyLogo) {
          els.logo.src = p.companyLogo;
          els.logo.alt = p.companyName ? `${p.companyName} Logo` : 'Company Logo';
        } else {
          // keep placeholder
          els.logo.src = 'https://via.placeholder.com/240x160?text=No+Logo';
          els.logo.alt = 'No Logo';
        }
      } catch (e) {
        console.warn('Error setting logo', e);
      }
    }

    // Recruiter info
    setText(els.desig, p.designation);
    setText(els.dept, p.department);

    if (els.linkedin) {
      try {
        if (p.linkedin) {
          els.linkedin.href = p.linkedin;
          els.linkedin.textContent = 'LinkedIn Profile';
        } else {
          els.linkedin.removeAttribute && els.linkedin.removeAttribute('href');
          els.linkedin.textContent = '—';
        }
      } catch (e) {
        console.warn('Error setting linkedin', e);
      }
    }

    setText(els.govId, p.govtBusinessId);

    // Updated
    if (els.updatedAt) {
      try {
        if (p.updatedAt) {
          const d = new Date(p.updatedAt);
          els.updatedAt.textContent = isNaN(d) ? '—' : d.toLocaleString();
        } else {
          els.updatedAt.textContent = '—';
        }
      } catch (e) {
        console.warn('Error setting updatedAt', e);
        els.updatedAt.textContent = '—';
      }
    }

    // If profile rendered successfully, hide empty state if present
    if (els.empty) {
      try {
        safeAddClass(els.empty, 'd-none'); // hide empty state
      } catch (e) { /* ignore */ }
    }
  }

  function setStatus(complete) {
    if (!els.status) return;
    try {
      els.status.className = 'badge ms-3 ' + (complete ? 'bg-success' : 'bg-warning text-dark');
      els.status.textContent = complete ? 'Profile Complete' : 'Profile Incomplete';
    } catch (e) {
      console.warn('setStatus error', e);
    }
  }
})();
