document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role') || 'candidate';

  // internship button
  const internshipBtn = document.getElementById('postInternshipBtn');
  if (internshipBtn) {
    internshipBtn.addEventListener('click', (e) => {
      if (role !== 'recruiter') {
        e.preventDefault();
        alert('This button only for recruiter');
      }
    });
  }

  // job button
  const jobBtn = document.getElementById('postJobBtn');
  if (jobBtn) {
    jobBtn.addEventListener('click', (e) => {
      if (role !== 'recruiter') {
        e.preventDefault();
        alert('This button only for recruiter');
      }
    });
  }
});
