function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  async function loadInternships() {
    try {
      const res = await fetch('/api/internships');
      if (!res.ok) throw new Error('Network response not ok');
      const internships = await res.json();

      const list = document.getElementById('internshipList');
      list.innerHTML = '';

      if (!Array.isArray(internships) || internships.length === 0) {
        list.innerHTML = '<div class="text-muted px-3">No internships found.</div>';
        updateScrollButtons(); return;
      }

      internships.forEach(intern => {
        const card = document.createElement('div');
        card.className = 'intern-card card';

        const title = escapeHtml(intern.title || 'Untitled');
        const company = escapeHtml(intern.company || '');
        const location = escapeHtml(intern.location || '');
        const desc = escapeHtml((intern.description || '').slice(0, 120));

        card.innerHTML = `
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div class="card-title">${title}</div>
                <div class="text-muted small">${company}</div>
              </div>
              <div class="text-muted small">${location}</div>
            </div>

            <p class="card-text mb-3">${desc}${(intern.description && intern.description.length>120)?'...':''}</p>

            <div class="mt-auto d-flex justify-content-between align-items-center">
              <a href="/see-internship-view.html?jobId=${encodeURIComponent(intern._id || intern.id || '')}" class="btn btn-sm btn-primary">View</a>
              <div class="text-muted small"><i class="fa fa-user-check"></i> ${intern.applied || 0} Applied</div>
            </div>
          </div>
        `;
        list.appendChild(card);
      });

      updateScrollButtons();
    } catch (err) {
      console.error('Error fetching internships:', err);
      document.getElementById('internshipList').innerHTML = '<div class="text-danger px-3">Error loading internships</div>';
      updateScrollButtons();
    }
  }

  function getScrollAmount(container) {
    const firstCard = container.querySelector('.intern-card');
    if (!firstCard) return container.clientWidth * 0.8;
    const style = getComputedStyle(container);
    const gap = parseInt(style.columnGap || style.gap) || 16;
    return firstCard.offsetWidth + gap;
  }

  function updateScrollButtons() {
    const container = document.querySelector('#internshipList');
    const leftBtn = document.querySelector('.scroll-button-left');
    const rightBtn = document.querySelector('.scroll-button-right');
    if (!container || !leftBtn || !rightBtn) return;
    leftBtn.disabled = container.scrollLeft <= 0;
    rightBtn.disabled = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
    leftBtn.style.opacity = leftBtn.disabled ? '0.45' : '1';
    rightBtn.style.opacity = rightBtn.disabled ? '0.45' : '1';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#internshipList');
    const leftBtn = document.querySelector('.scroll-button-left');
    const rightBtn = document.querySelector('.scroll-button-right');

    loadInternships();

    leftBtn.addEventListener('click', () => {
      const amt = getScrollAmount(container);
      container.scrollBy({ left: -amt, behavior: 'smooth' });
    });
    rightBtn.addEventListener('click', () => {
      const amt = getScrollAmount(container);
      container.scrollBy({ left: amt, behavior: 'smooth' });
    });

    container.addEventListener('scroll', () => requestAnimationFrame(updateScrollButtons));
    window.addEventListener('resize', () => requestAnimationFrame(updateScrollButtons));
  });