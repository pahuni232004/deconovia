/**
 * Know the Product: 4 scroll steps (sun/moon), Section 5 flashlight → solid + Deconovia (scroll to advance).
 */
(function () {
  const STEPS = [
    { sunOpacity: 1, sunBrightness: 1.02, sunHalo: 0.92 },
    { sunOpacity: 0.9, sunBrightness: 0.88, sunHalo: 0.62 },
    { sunOpacity: 0.62, sunBrightness: 0.62, sunHalo: 0.32 },
    { sunOpacity: 0.32, sunBrightness: 0.38, sunHalo: 0.1 },
  ];

  const torchSection = document.getElementById("know-torch-section");
  const torchSolid = torchSection?.querySelector(".know-torch-solid");
  const TORCH_ACTIVATE_DELAY_MS = 900;
  let torchDominantSinceMs = 0;
  const panels = Array.from(document.querySelectorAll(".know-panel[data-know-index]"));
  if (!panels.length) return;

  function applyStep(step) {
    const s = Math.max(0, Math.min(STEPS.length - 1, step));
    const cfg = STEPS[s];
    document.body.dataset.knowStep = String(s);
    document.documentElement.style.setProperty("--know-sun-opacity", String(cfg.sunOpacity));
    document.documentElement.style.setProperty("--know-sun-brightness", String(cfg.sunBrightness));
    document.documentElement.style.setProperty("--know-sun-halo", String(cfg.sunHalo));
  }

  function visibleRatio(el) {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, vh);
    return Math.max(0, bottom - top) / vh;
  }

  function isTorchDominant() {
    return torchSection && visibleRatio(torchSection) > 0.48;
  }

  function computeStep() {
    const vh = window.innerHeight || 1;
    // Use an upper trigger line so sky/sun colors react sooner during scroll.
    const centerY = vh * 0.34;
    let best = 0;
    let bestDist = Infinity;
    panels.forEach((panel, i) => {
      const r = panel.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const d = Math.abs(mid - centerY);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  let ticking = false;
  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (isTorchDominant()) {
        applyStep(3);
        return;
      }
      applyStep(computeStep());
    });
  }

  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);
  applyStep(0);
  queueMicrotask(onScrollOrResize);

  if (!torchSection) return;

  function activateTorchSolid() {
    if (torchSection.classList.contains("know-torch-solid-active")) return;
    torchSection.classList.add("know-torch-solid-active");
    if (torchSolid) {
      torchSolid.removeAttribute("aria-hidden");
      torchSolid.removeAttribute("inert");
    }
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function canActivateTorchSolid() {
    if (!document.body.classList.contains("know-torch-mode")) return false;
    if (torchSection.classList.contains("know-torch-solid-active")) return false;
    if (reduceMotion) return true;
    if (!torchDominantSinceMs) return false;
    return performance.now() - torchDominantSinceMs >= TORCH_ACTIVATE_DELAY_MS;
  }

  function setTorchPosition(clientX, clientY) {
    if (torchSection.classList.contains("know-torch-solid-active")) return;
    const r = torchSection.getBoundingClientRect();
    torchSection.style.setProperty("--torch-x", `${clientX - r.left}px`);
    torchSection.style.setProperty("--torch-y", `${clientY - r.top}px`);
  }

  function centerTorch() {
    const r = torchSection.getBoundingClientRect();
    setTorchPosition(r.left + r.width / 2, r.top + r.height / 2);
  }

  const torchIo = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (!e) return;
      const ratio = e.intersectionRatio;
      e.target.classList.toggle("is-revealed", ratio > 0.12);
      const dominant = ratio > 0.38;
      document.body.classList.toggle("know-torch-mode", dominant);
      if (dominant && !torchDominantSinceMs) {
        torchDominantSinceMs = performance.now();
      }
      if (!dominant) {
        torchDominantSinceMs = 0;
      }
      if (ratio > 0.12 && !torchSection.classList.contains("know-torch-solid-active")) centerTorch();
    },
    { threshold: [0, 0.08, 0.12, 0.25, 0.38, 0.55, 0.75, 1] }
  );
  torchIo.observe(torchSection);

  torchSection.addEventListener(
    "wheel",
    (ev) => {
      if (!canActivateTorchSolid()) return;
      if (ev.deltaY > 6) activateTorchSolid();
    },
    { passive: true }
  );

  let touchY0 = null;
  torchSection.addEventListener(
    "touchstart",
    (ev) => {
      touchY0 = ev.touches[0] ? ev.touches[0].clientY : null;
    },
    { passive: true }
  );
  torchSection.addEventListener(
    "touchmove",
    (ev) => {
      if (touchY0 == null || !ev.touches[0]) return;
      if (!canActivateTorchSolid()) return;
      const dy = touchY0 - ev.touches[0].clientY;
      if (dy > 28) {
        activateTorchSolid();
        touchY0 = null;
      }
    },
    { passive: true }
  );

  torchSection.addEventListener(
    "pointermove",
    (ev) => {
      setTorchPosition(ev.clientX, ev.clientY);
    },
    { passive: true }
  );

  torchSection.addEventListener(
    "pointerenter",
    (ev) => {
      setTorchPosition(ev.clientX, ev.clientY);
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    if (
      torchSection.classList.contains("is-revealed") &&
      !torchSection.classList.contains("know-torch-solid-active")
    ) {
      centerTorch();
    }
  });
})();
