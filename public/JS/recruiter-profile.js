(() => {
  const form = document.getElementById('recruiterProfileForm');
  if (!form) return;

  // Get logged-in recruiter id (DEV: from localStorage)
  const recruiterId = localStorage.getItem('recruiterId') || localStorage.getItem('userId');
  if (!recruiterId) {
    // Not logged in → go to login
    location.href = '/login.html';
    return;
  }

  // Optional: add a logo preview element if not present
  let logoPreview = document.getElementById('logoPreview');
  if (!logoPreview) {
    logoPreview = document.createElement('img');
    logoPreview.id = 'logoPreview';
    logoPreview.alt = 'Company Logo Preview';
    logoPreview.className = 'img-fluid rounded border my-2';
    logoPreview.style.maxHeight = '160px';
    // insert after the logo input
    const logoInput = form.querySelector('input[name="companyLogo"]');
    if (logoInput?.parentElement) logoInput.parentElement.appendChild(logoPreview);
  }

  // Prefill on load
  loadAndFill();

  async function loadAndFill() {
    try {
      const res = await fetch('/api/recruiter/profile/me', {
        headers: { 'x-recruiter-id': localStorage.getItem("userId") },
        cache: 'no-store'
      });

      if (!res.ok) {
        // If not found yet, just keep empty form
        console.warn('Recruiter profile not found', res.status);
        setDefaultPreview();
        return;
      }

      const p = await res.json();

      // Fill inputs (match your form field names)
      setVal('companyName', p.companyName);
      setVal('companyWebsite', p.companyWebsite);
      setVal('companySize', p.companySize);
      setVal('industryType', p.industryType);
      setVal('headquarters', p.headquarters);
      setVal('companyDescription', p.companyDescription);
      setVal('designation', p.designation);
      setVal('linkedin', p.linkedin);
      setVal('department', p.department);
      setVal('govtBusinessId', p.govtBusinessId);

      // Logo preview
      if (p.companyLogo) {
        logoPreview.src = p.companyLogo;
        logoPreview.alt = (p.companyName || 'Company') + ' Logo';
      } else {
        setDefaultPreview();
      }
    } catch (err) {
      console.warn('[profile] load error:', err);
      setDefaultPreview();
    }
  }

  function setVal(name, val) {
    const el = form.elements[name];
    if (!el) return;
    const v = (val ?? '').toString();
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = v;
    }
  }

  function setDefaultPreview() {
    if (logoPreview) {
      // use a local fallback image if you have: /images/no-logo.png
      logoPreview.src = 'https://placehold.co/240x160?text=No+Logo';
    }
  }

  // Show chosen file instantly in preview (doesn’t upload yet)
  form.companyLogo?.addEventListener('change', () => {
    const file = form.companyLogo.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    logoPreview.src = url;
  });

  // Submit handler (saves + stays compatible with your API)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // basic required check (HTML required already present)
    if (!form.companyName.value.trim() || !form.designation.value.trim()) {
      alert('Company Name and Designation are required.');
      return;
    }

    const fd = new FormData(form);

    try {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

      const res = await fetch('/api/recruiter/profile', {
        method: 'POST',
        headers: { 'x-recruiter-id': recruiterId }, // DEV header; replace with JWT later
        body: fd
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }

      const data = await res.json();

      // Optional: mark as complete for your guards
      localStorage.setItem('recruiterProfileComplete', 'true');

      // Reload fill to reflect saved data (and server-stored logo path)
      await loadAndFill();

      // Redirect if you want to go post job immediately:
      // location.href = '/post-job.html';
      window.location.href = '/recruiter-profile-view.html';
    } catch (err) {
      alert(err.message);
    } finally {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Profile'; }
    }
  });
})();
