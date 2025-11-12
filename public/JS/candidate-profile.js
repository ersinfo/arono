(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('candidateProfileForm');
    if (!form) {
      console.warn('candidateProfileForm not found in DOM');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('[data-submit]');
    if (submitBtn) submitBtn.disabled = false;

    const candidateId = localStorage.getItem('candidateId') || localStorage.getItem('userId') || '';

    // validate candidateId client-side before allowing submit
    function isValidObjectId(id) {
      return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
    }

    if (!candidateId || !isValidObjectId(candidateId)) {
      console.warn('candidateId missing or invalid in localStorage');
      // prevent accidental submit when id is missing/invalid
      if (submitBtn) submitBtn.addEventListener('click', (e) => {
        if (!isValidObjectId(localStorage.getItem('candidateId') || localStorage.getItem('userId') || '')) {
          e.preventDefault();
          alert('आप लॉगिन नहीं हैं या आपकी session invalid है. कृपया फिर से लॉगिन करें।');
        }
      }, { once: true });
    }

    // Elements that match your HTML names
    const fileInput = form.querySelector('input[name="resume"]');
    const resumeLabel = document.getElementById('resumeLabel');

    // show filename in resumeLabel and small preview for images
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) {
          if (resumeLabel) resumeLabel.textContent = '';
          return;
        }

        // show filename
        if (resumeLabel) resumeLabel.innerHTML = `<strong>Selected:</strong> ${escapeHtml(f.name)}`;

        // if image show preview (not necessary for resume but harmless)
        if (/^image\//.test(f.type)) {
          let img = document.getElementById('resumePreview');
          if (!img) {
            img = document.createElement('img');
            img.id = 'resumePreview';
            img.className = 'img-fluid rounded border my-2';
            img.style.maxHeight = '160px';
            fileInput.parentElement.appendChild(img);
          }
          img.src = URL.createObjectURL(f);
        }
      });
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

    function setBtnSaving(saving) {
      if (!submitBtn) return;
      submitBtn.disabled = saving;
      if (saving) {
        submitBtn.dataset.orig = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Saving...';
      } else {
        submitBtn.innerHTML = submitBtn.dataset.orig || 'Save Profile';
      }
    }

    // ---------- Submit handler (injected, robust) ----------
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();

      // re-validate candidateId at submit time
      const currentCandidateId = localStorage.getItem('candidateId') || localStorage.getItem('userId') || '';
      if (!isValidObjectId(currentCandidateId)) {
        return alert('Candidate ID missing या invalid है. कृपया लॉगिन करके पुनः प्रयास करें।');
      }

      // basic client-side required fields check
      const fullName = (form.elements['fullName']?.value || '').trim();
      const currentDesignation = (form.elements['currentDesignation']?.value || '').trim();
      if (!fullName) return alert('Full Name आवश्यक है।');
      if (!currentDesignation) return alert('Current Designation आवश्यक है।');

      // optional: validate email format if provided
      const email = (form.elements['email']?.value || '').trim();
      if (email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(email)) return alert('सही Email डालें।');
      }

      setBtnSaving(true);

      try {
        const fd = new FormData();

        // explicit list of fields to append. Keep in sync with your server model.
        const fields = [
          'fullName','fatherName','dob','gender','phone','email','address','city','state','pinCode',
          'currentDesignation','experienceYears','noticePeriod','education','skills','linkedin'
        ];

        fields.forEach(name => {
          const el = form.elements[name];
          if (el) {
            // for checkboxes/radios handle differently if needed; here treat as a value
            fd.append(name, (el.value || '').trim());
          } else {
            fd.append(name, '');
          }
        });

        // append resume file if present
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('resume', fileInput.files[0], fileInput.files[0].name);
        }

        // include candidate id header
        const headers = { 'x-candidate-id': currentCandidateId };

        const res = await fetch('/api/candidate/profile', {
          method: 'POST',
          headers,
          body: fd,
          cache: 'no-store'
        });

        // parse json safely
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }

        if (!res.ok) {
          const msg = (data && (data.error || data.message)) || `Save failed (status ${res.status})`;
          throw new Error(msg);
        }

        // ----------------- SUCCESS: update local state and redirect -----------------
        try {
          localStorage.setItem('candidateProfileComplete', 'true');
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          if (u && typeof u === 'object') { u.profileComplete = true; localStorage.setItem('user', JSON.stringify(u)); }
        } catch (e) {
          // ignore localStorage write errors
        }

        // ensure button UI updates then navigate. use replace to avoid history entry.
        setTimeout(() => {
          try {
            window.location.replace('/candidate-profile-view.html');
          } catch (e) {
            window.location.href = '/candidate-profile-view.html';
          }
        }, 150);
        // ---------------------------------------------------------------------------

      } catch (err) {
        alert(err.message || 'Error saving profile.');
      } finally {
        setBtnSaving(false);
      }
    });

  }); // end DOMContentLoaded

})(); // end IIFE
