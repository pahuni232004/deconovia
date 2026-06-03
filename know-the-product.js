/* Product Catalog — interactive behaviour */
(function () {
  'use strict';

  const sections = document.querySelectorAll('.cat-section');
  const tabs     = document.querySelectorAll('.cat-tab');
  const dots     = document.querySelectorAll('.cat-dot');
  const header   = document.getElementById('cat-header') || document.querySelector('.top-nav');

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = (header ? header.offsetHeight : 68) + 8;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  }

  tabs.forEach(t => t.addEventListener('click', () => scrollTo(t.dataset.target)));
  dots.forEach(d => d.addEventListener('click', () => scrollTo(d.dataset.target)));

  function setActive(id) {
    tabs.forEach(t => { const on = t.dataset.target === id; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
    dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
  }

  if ('IntersectionObserver' in window && sections.length) {
    const sIO = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { threshold: 0.4 });
    sections.forEach(s => sIO.observe(s));

    const rIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.cat-spec').forEach((el, i) => { el.style.transitionDelay = `${i * 0.06}s`; el.classList.add('visible'); });
        e.target.querySelector('.cat-product-desc')?.classList.add('visible');
        e.target.querySelector('.cat-tags')?.classList.add('visible');
        rIO.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    sections.forEach(s => rIO.observe(s));
  }

  sections.forEach(sec => {
    const img = sec.querySelector('.cat-product-img');
    if (!img) return;
    sec.addEventListener('mouseenter', () => { img.style.animation = 'none'; });
    sec.addEventListener('mouseleave', () => { img.style.animation = ''; img.style.transform = ''; });
    sec.addEventListener('mousemove', e => {
      const r = sec.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      img.style.transform = `rotateX(${-dy * 7}deg) rotateY(${dx * 9}deg) scale(1.04)`;
    });
  });

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.top-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => { const open = nav.classList.toggle('menu-open'); toggle.setAttribute('aria-expanded', open); });
  }

  if (location.hash) setTimeout(() => scrollTo(location.hash.slice(1)), 300);
})();
