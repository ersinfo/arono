
(function(){
  try {
    const MAX_MS = 3000, INTERVAL = 80, start = Date.now();

    function apply(role) {
      const my = document.getElementById('offcanvasApplicationsLink');
      const rec = document.getElementById('offcanvasApplicationsLink1');
      if (!my && !rec) return false;

      if (my) my.style.setProperty('display','none','important');
      if (rec) rec.style.setProperty('display','none','important');

      if (role === 'candidate') {
        if (my) my.style.removeProperty('display');
      } else if (role === 'recruiter') {
        if (rec) rec.style.removeProperty('display');
      }
      return true;
    }

    function attempt() {
      const role = (localStorage.getItem('role') || '').toLowerCase();
      const done = apply(role);
      if (!done && (Date.now() - start) < MAX_MS) setTimeout(attempt, INTERVAL);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attempt);
    else attempt();

    const obs = new MutationObserver(()=> apply((localStorage.getItem('role')||'').toLowerCase()));
    obs.observe(document.body, { childList:true, subtree:true });
    setTimeout(()=>obs.disconnect(), 5000);
  } catch(e){ console.warn('role-toggle error', e); }
})();

