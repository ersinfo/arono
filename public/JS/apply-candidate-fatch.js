
document.addEventListener('DOMContentLoaded', async () => {
  const candidateId = localStorage.getItem('candidateId'); // या जो भी तरीका है header set करने का

  if (!candidateId) return console.warn('Candidate ID missing');

  try {
    const res = await fetch('/api/candidate/profile/me', {
      headers: {
        'x-candidate-id': candidateId,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.error('Failed to fetch profile', res.status);
      return;
    }

    const profile = await res.json();
    // console.log('Fetched profile:', profile);

    // Autofill fields
    if (profile.fullName) document.querySelector('#fullName').value = profile.fullName;
    if (profile.email) document.querySelector('#email').value = profile.email;
    if (profile.phone) document.querySelector('#phone').value = profile.phone;
    if (profile.location) document.querySelector('#location').value = profile.location;
    if (profile.dob) document.querySelector('#dob').value = new Date(profile.dob).toISOString().split('T')[0];
    if (profile.currentDesignation) document.querySelector('#currentDesignation').value = profile.currentDesignation;
    if (profile.education) document.querySelector('#education').value = profile.education;
    if (profile.skills && profile.skills.length) document.querySelector('#skills').value = profile.skills.join(', ');
    if (profile.linkedin) document.querySelector('#linkedin').value = profile.linkedin;

    // Leave resume & experienceYears empty
    document.querySelector('#resume').value = '';
    document.querySelector('#experienceYears').value = '';
    document.querySelector('#candidateExperience').value = '';

  } catch (err) {
    console.error('Error fetching profile:', err);
  }
});

// Bootstrap 5 validation
(() => {
  const form = document.getElementById('applyForm');
  form.addEventListener('submit', (event) => {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add('was-validated');
  }, false);
})();