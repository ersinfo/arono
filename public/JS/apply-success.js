
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const candidateId = localStorage.getItem('candidateId'); // fallback only
    if (!token && !candidateId) throw new Error('Candidate not logged in');

    const internshipId = new URLSearchParams(window.location.search).get('id');
    if (!internshipId) throw new Error('Invalid internship id');

    const experienceYears = document.querySelector('#experienceYears').value || '';
    const resumeUrl = document.querySelector('#resume')?.value || '';

    const payload = { internshipId, experienceYears, resumeUrl };

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    // keep header fallback if server expects x-candidate-id
    if (!token && candidateId) headers['x-candidate-id'] = candidateId;

    const res = await fetch('/api/application/internship', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server ${res.status}: ${text}`);
    }

    const data = await res.json();
    console.log('Applied OK', data);
    alert('Applied successfully');
    window.location.href = 'intern.html';
  } catch (err) {
    console.error('Apply error:', err);
    alert('Apply failed: ' + (err.message || err));
  }
});
