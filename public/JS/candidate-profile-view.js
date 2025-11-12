// public/JS/candidate-profile-view.js
(function () {
  'use strict';

  const candidateId = localStorage.getItem('candidateId') || localStorage.getItem('userId');
  if (!candidateId) { location.href = '/login.html'; return; }

  // DOM ids used in HTML above
  const els = {
    status: document.getElementById('profileStatus'),
    photo: document.getElementById('candidatePhoto'),
    name: document.getElementById('candidateName'),
    designation: document.getElementById('candidateDesignation'),
    location: document.getElementById('candidateLocation'),
    experience: document.getElementById('candidateExperience'),
    dob: document.getElementById('candidateDob'),
    email: document.getElementById('candidateEmail'),
    phone: document.getElementById('candidatePhone'),
    education: document.getElementById('candidateEducation'),
    skills: document.getElementById('candidateSkills'),
    linkedin: document.getElementById('candidateLinkedin'),
    resumeText: document.getElementById('candidateResume'),
    resumeBtn: document.getElementById('downloadResumeBtn'),
    resumePdfBtn: document.getElementById('downloadPdfBtn'),
    updatedAt: document.getElementById('updatedAt'),
    empty: document.getElementById('emptyState')
  };

  function setText(el, val) { if (!el) return; el.textContent = (val !== undefined && val !== null && String(val).trim() !== '') ? String(val) : '—'; }
  function setHref(el, href, label) { if (!el) return; el.href = href; el.textContent = label || href; el.classList.remove('d-none'); }
  function setImg(el, src) { if (!el) return; try { el.src = src; } catch(e){} }

  // Fetch profile
  fetch('/api/candidate/profile/me', { headers: { 'x-candidate-id': candidateId }, cache: 'no-store' })
    .then(async r => {
      if (!r.ok) {
        let txt = `Profile fetch failed (${r.status})`;
        try { const j = await r.json(); if (j && (j.error||j.message)) txt = j.error || j.message; } catch(e){}
        throw new Error(txt);
      }
      return r.json();
    })
    .then(p => renderProfile(p || {}))
    .catch(err => {
      console.error('Profile load error:', err);
      if (els.empty) els.empty.classList.remove('d-none');
      if (els.status) { els.status.className = 'badge ms-3 bg-warning text-dark'; els.status.textContent = 'Profile Incomplete'; }
    });

  function renderProfile(p) {
    // mapping with fallbacks (match your schema names)
    const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.name || '';
    const designation = p.currentDesignation || p.currentRole || p.designation || p.role || '';
    const location = p.location || [p.city, p.state, p.country].filter(Boolean).join(', ') || '';
    const experience = p.experienceYears || p.experience || (p.workExperience ? String(p.workExperience) : '') || '';
    const dob = p.dob ? (new Date(p.dob).toLocaleDateString()) : (p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '');
    const email = p.email || p.contactEmail || '';
    const phone = p.phone || p.mobile || p.contactNumber || '';
    const education = Array.isArray(p.education) ? p.education.join(', ') : (p.education || p.qualifications || '');
    const skills = Array.isArray(p.skills) ? p.skills.join(', ') : (typeof p.skills === 'string' ? p.skills : (p.keySkills ? (Array.isArray(p.keySkills) ? p.keySkills.join(', ') : p.keySkills) : ''));
    const linkedin = p.linkedin || p.linkedinUrl || p.profileLinkedin || '';
    const resumeUrl = p.resumeUrl || p.resumeLink || p.cvUrl || '';
    const photoUrl = p.profilePhoto || p.photo || p.resumeOrPhoto || resumeUrl || '';
    const updated = p.updatedAt || p.modifiedAt || p.createdAt || '';

    // set DOM
    setText(els.name, name);
    setText(els.designation, designation);
    setText(els.location, location);
    setText(els.experience, experience);
    setText(els.dob, dob);
    setText(els.email, email);
    setText(els.phone, phone);
    setText(els.education, education);
    setText(els.skills, skills);

    if (linkedin && els.linkedin) {
      els.linkedin.href = linkedin;
      els.linkedin.textContent = linkedin;
      els.linkedin.classList.remove('d-none');
    } else if (els.linkedin) {
      els.linkedin.href = '#';
      els.linkedin.textContent = '—';
    }

    if (resumeUrl) {
      if (els.resumeText) els.resumeText.textContent = 'Resume available';
      setHref(els.resumeBtn, resumeUrl, 'View Resume');
      setHref(els.resumePdfBtn, resumeUrl, 'Download');
    } else {
      if (els.resumeText) els.resumeText.textContent = '—';
      if (els.resumeBtn) els.resumeBtn.classList.add('d-none');
      if (els.resumePdfBtn) els.resumePdfBtn.classList.add('d-none');
    }

    if (photoUrl) setImg(els.photo, photoUrl);

    if (els.updatedAt) els.updatedAt.textContent = updated ? new Date(updated).toLocaleString() : '—';

    if (els.status) {
      els.status.className = 'badge ms-3 ' + (p.profileComplete ? 'bg-success' : 'bg-warning text-dark');
      els.status.textContent = p.profileComplete ? 'Profile Complete' : 'Profile Incomplete';
    }

    if (els.empty) els.empty.classList.add('d-none');
  }
})();
