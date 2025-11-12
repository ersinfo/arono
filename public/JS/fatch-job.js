function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  async function loadJobs() {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Network response not ok');
      const jobs = await res.json();

      const list = document.getElementById('jobsList');
      list.innerHTML = '';

      if (!Array.isArray(jobs) || jobs.length === 0) {
        list.innerHTML = '<div class="text-muted px-3">No jobs found.</div>';
        return;
      }

      jobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card card';

        // Use the same fields you have in backend; adapt if different
        const title = escapeHtml(job.title || 'Untitled');
        const company = escapeHtml(job.company || '');
        const location = escapeHtml(job.location || '');
        const desc = escapeHtml((job.description || '').slice(0, 120));

        card.innerHTML = `
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div class="card-title">${title}</div>
                <div class="text-muted small">${company}</div>
              </div>
              <div class="text-muted small">${location}</div>
            </div>

            <p class="card-text mb-3">${desc}${(job.description && job.description.length>120)?'...':''}</p>

            <div class="mt-auto d-flex justify-content-between align-items-center">
              <a href="/see-job-view.html?jobId=${encodeURIComponent(job._id || job.id || '')}" class="btn btn-sm btn-primary">View</a>
              <div class="text-muted small"><i class="fa fa-user-check"></i> ${job.applied || 0} Applied</div>
            </div>
          </div>
        `;

        list.appendChild(card);
      });

      // After rendering, ensure buttons enable/disable appropriately
      updateScrollButtons();
    } catch (err) {
      console.error('Error fetching jobs:', err);
      document.getElementById('jobsList').innerHTML = '<div class="text-danger px-3">Error loading jobs</div>';
    }
  }

  // Scroll logic
  function getScrollAmount(container) {
    // scroll by one card width plus gap
    const firstCard = container.querySelector('.job-card');
    if (!firstCard) return container.clientWidth * 0.8;
    const style = getComputedStyle(container);
    const gap = parseInt(style.columnGap || style.gap) || 16;
    return firstCard.offsetWidth + gap;
  }

  function updateScrollButtons() {
    const container = document.querySelector('.cards-row');
    const leftBtn = document.querySelector('.scroll-button-left');
    const rightBtn = document.querySelector('.scroll-button-right');
    if (!container) return;
    leftBtn.disabled = container.scrollLeft <= 0;
    rightBtn.disabled = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
    leftBtn.style.opacity = leftBtn.disabled ? '0.45' : '1';
    rightBtn.style.opacity = rightBtn.disabled ? '0.45' : '1';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.cards-row');
    const leftBtn = document.querySelector('.scroll-button-left');
    const rightBtn = document.querySelector('.scroll-button-right');

    loadJobs();

    // Buttons click
    leftBtn.addEventListener('click', () => {
      const amt = getScrollAmount(container);
      container.scrollBy({ left: -amt, behavior: 'smooth' });
    });
    rightBtn.addEventListener('click', () => {
      const amt = getScrollAmount(container);
      container.scrollBy({ left: amt, behavior: 'smooth' });
    });

    // update buttons on manual scroll / resize
    container.addEventListener('scroll', () => requestAnimationFrame(updateScrollButtons));
    window.addEventListener('resize', () => requestAnimationFrame(updateScrollButtons));
  });