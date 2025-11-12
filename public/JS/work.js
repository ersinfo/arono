// ----------------- Carousel Scroll -----------------
const scrollContainer = document.getElementById('internshipScroll');
const btnLeft = document.querySelector('.scroll-button-left');
const btnRight = document.querySelector('.scroll-button-right');

const scrollAmount = 330;
if (btnLeft && btnRight && scrollContainer) {
  btnLeft.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  btnRight.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
}

// ----------------- Auto Scroll Review -----------------
const carousel = document.getElementById('reviewCarousel');
let cardWidth = 0;
let scrollIndex = 0;

function updateCardVars() {
  const card = carousel?.querySelector('.review-card');
  if (!card) return;
  const style = getComputedStyle(card);
  const marginRight = parseInt(style.marginRight) || 0;
  cardWidth = card.offsetWidth + marginRight + 26;
}
window.addEventListener('resize', updateCardVars);
updateCardVars();

function cloneCardsForLoop() {
  if (!carousel) return;
  const cards = Array.from(carousel.children).slice();
  for (let i = 0; i < cards.length; i++) {
    const clone = cards[i].cloneNode(true);
    clone.classList.add('cloned-card');
    carousel.appendChild(clone);
  }
}
if (carousel) cloneCardsForLoop();

carousel?.addEventListener('transitionend', () => {
  const realCount = carousel.childNodes.length / 2;
  if (scrollIndex >= realCount) {
    carousel.style.transition = 'none';
    carousel.style.transform = 'translateX(0)';
    scrollIndex = 0;
    carousel.offsetHeight; // Force reflow
    setTimeout(() => {
      carousel.style.transition = 'transform 0.9s cubic-bezier(.6, .01, .47, .99)';
    }, 20);
  }
});

function autoScroll() {
  if (!carousel) return;
  const realCount = carousel.childNodes.length / 2;
  scrollIndex++;
  carousel.style.transform = `translateX(${-cardWidth * scrollIndex}px)`;
}
if (carousel) setInterval(autoScroll, 2600);

// ----------------- Login Form Submit -----------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (res.ok) {
      // ✅ Save login info
      localStorage.setItem('userName', result.name);
      localStorage.setItem('userRole', result.role);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userId', result.userId);

      // ✅ recruiterId alias set karo
      if (!localStorage.getItem('recruiterId')) {
        localStorage.setItem('recruiterId', result.userId);
      }

      // optional: agar backend name split karke deta hai
      if (result.firstName) localStorage.setItem('firstName', result.firstName);
      if (result.lastName) localStorage.setItem('lastName', result.lastName);

      // ✅ Redirect by role
      if (result.role === 'Recruiter') {
        window.location.href = '/recruiter-dashboard.html';
      } else {
        window.location.href = '/index.html';
      }
    } else {
      alert(result.error || 'Login failed');
    }
  });
}


