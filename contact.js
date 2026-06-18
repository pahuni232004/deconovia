/* ── Replace the value below with your deployed Apps Script URL ── */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwa-MsT4Lo2DLgL0voOQNw0F5TZmQ9u9lY4rUMGuKRQPxgFnRk_RFXRwc_K6_bb_9gNGw/exec';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Mobile nav toggle + sidebar overlay ──────────────────── */
  const toggle = document.querySelector('.nav-toggle');
  const topNav = document.querySelector('.top-nav');
  if (toggle && topNav) {
    const navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);
    const closeNav = () => { topNav.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); navOverlay.classList.remove('is-open'); document.body.style.overflow = ''; };
    const openNav  = () => { topNav.classList.add('menu-open');    toggle.setAttribute('aria-expanded', 'true');  navOverlay.classList.add('is-open');    document.body.style.overflow = 'hidden'; };
    toggle.addEventListener('click', () => topNav.classList.contains('menu-open') ? closeNav() : openNav());
    navOverlay.addEventListener('click', closeNav);
    window.addEventListener('resize', () => { if (window.innerWidth > 860) closeNav(); });
  }

  /* ── Contact form → Google Sheet ───────────────────────────── */
  const form   = document.getElementById('contact-inquiry-form');
  const msgEl  = document.getElementById('contact-form-msg');
  if (!form || !msgEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));
    const required = ['name', 'email', 'phone', 'subject', 'message'];
    if (required.some(k => !data[k]?.trim())) {
      showMsg(msgEl, 'Please complete all fields before submitting.', true);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      /* no-cors lets the request fire without triggering a CORS error.
         We can't read the response, but the Apps Script receives it. */
      await fetch(SHEET_URL, {
        method: 'POST',
        body: new URLSearchParams(data),
        mode: 'no-cors',
      });
      showMsg(msgEl, 'Thank you! Your inquiry has been submitted successfully.', false);
      form.reset();
    } catch {
      showMsg(msgEl, 'Something went wrong. Please try again or contact us directly.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
});

function showMsg(el, text, isError) {
  el.hidden = false;
  el.textContent = text;
  el.style.color = isError ? '#b83232' : '#3d6b2e';
}
