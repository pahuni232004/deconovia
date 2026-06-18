(function () {
  'use strict';

  // Mobile nav toggle + sidebar overlay
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.top-nav');
  if (toggle && nav) {
    const navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);
    const closeNav = () => { nav.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); navOverlay.classList.remove('is-open'); document.body.style.overflow = ''; };
    const openNav  = () => { nav.classList.add('menu-open');    toggle.setAttribute('aria-expanded', 'true');  navOverlay.classList.add('is-open');    document.body.style.overflow = 'hidden'; };
    toggle.addEventListener('click', () => nav.classList.contains('menu-open') ? closeNav() : openNav());
    navOverlay.addEventListener('click', closeNav);
    window.addEventListener('resize', () => { if (window.innerWidth > 860) closeNav(); });
  }

  // Scroll reveal for split blocks
  const blocks = document.querySelectorAll('.split-block');
  if ('IntersectionObserver' in window && blocks.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    blocks.forEach(b => io.observe(b));
  }
})();
