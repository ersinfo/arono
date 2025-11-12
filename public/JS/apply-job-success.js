document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const candidateId = localStorage.getItem('candidateId'); // fallback
    if (!token && !candidateId) throw new Error('Candidate not logged in');

    // Get job ID from URL ?id=JOB_ID
    const jobId = new URLSearchParams(window.location.search).get('id');
    if (!jobId) throw new Error('Invalid job id');

    // Optional form fields
    const experienceYears = document.querySelector('#experienceYears')?.value || '';
    const resumeUrl = document.querySelector('#resume')?.value || '';

    // Payload same as internship but for job
    const payload = { jobId, experienceYears, resumeUrl };

    // Prepare headers
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!token && candidateId) headers['x-candidate-id'] = candidateId;

    // API request for job
    const res = await fetch('/api/application/job', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server ${res.status}: ${text}`);
    }

    const data = await res.json();
    console.log('Job applied OK', data);
    alert('Job applied successfully');
    window.location.href = 'job.html'; // redirect after success
  } catch (err) {
    console.error('Job apply error:', err);
    alert('Apply failed: ' + (err.message || err));
  }
});
