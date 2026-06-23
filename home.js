const stage = document.getElementById("story-stage");
const heroFloat = document.getElementById("hero-float");
const panelTwo = document.querySelector(".panel-2");
const panelThree = document.querySelector(".panel-3");
const panelFour = document.querySelector(".panel-4");
const storyFrame = document.querySelector(".story-frame");
const siteFooter = document.querySelector('.site-footer');
const navToggle = document.querySelector(".nav-toggle");
const topNav = document.querySelector(".top-nav");

// Service slider elements
const servicesSection = document.getElementById("services-section");
const serviceCards = document.querySelectorAll(".service-card");
const scDots = document.querySelectorAll(".sc-dot");

const HERO_BASE_LEFT_OFFSET = 210; // CSS must match: left: calc(50% + 210px)
const HERO_BASE_TOP_VH = 18;
const HERO_BASE_TOP_PX_ADJUST = -45;
const MOBILE_BREAKPOINT = 980;
let mobileFreezePoint = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/* ── Service card stack reveal ───────────────────── */
const updateServiceCards = () => {
  if (!servicesSection || !serviceCards.length) return;
  // Mobile uses a CSS scroll-snap slider — no JS card stacking needed
  if (window.innerWidth <= MOBILE_BREAKPOINT) return;

  const sRect = servicesSection.getBoundingClientRect();
  // scrolledIn: how many px of the section have scrolled past the top
  const scrolledIn = -sRect.top;
  // Each card owns one viewport-height of scroll travel
  const cardBand = window.innerHeight;
  const rawIndex = Math.floor(scrolledIn / cardBand);
  const activeIndex = clamp(rawIndex, 0, serviceCards.length - 1);

  serviceCards.forEach((card, i) => {
    card.classList.remove("sc-active", "sc-past");
    if (i < activeIndex) {
      card.classList.add("sc-past");
    } else if (i === activeIndex) {
      card.classList.add("sc-active");
    }
    // cards above activeIndex stay at default (translateY(102%) = hidden below)
  });

  scDots.forEach((dot, i) => {
    dot.classList.toggle("sc-dot--active", i === activeIndex);
  });
};

/* ── Hero float animation ────────────────────────── */
const animateHero = () => {
  if (!stage || !heroFloat || !panelTwo || !panelThree || !panelFour || !storyFrame) return;

  const rect = stage.getBoundingClientRect();
  const frameRect = storyFrame.getBoundingClientRect();
  const totalScrollable = rect.height - window.innerHeight;
  const rawProgress = totalScrollable > 0 ? -rect.top / totalScrollable : 0;
  const progress = clamp(rawProgress, 0, 1);

  const initialTop = window.innerHeight * (HERO_BASE_TOP_VH / 100) + HERO_BASE_TOP_PX_ADJUST;
  const initialLeft = frameRect.width / 2 + HERO_BASE_LEFT_OFFSET;
  const heroHeight = heroFloat.offsetHeight || heroFloat.getBoundingClientRect().height;

  // Current scroll position (px scrolled from page top, equal to -frameRect.top)
  const scrollYpx = Math.max(0, -frameRect.top);

  // Final destination: tower at 55% of viewport width in section 4 (between text block and seal)
  const finalRect = panelFour.getBoundingClientRect();
  const targetCenterY = finalRect.top - frameRect.top + finalRect.height * 0.45;
  const targetCenterX = finalRect.left - frameRect.left + finalRect.width * 0.55;

  const targetTranslateY = targetCenterY - (initialTop + heroHeight / 2);
  const targetTranslateX = targetCenterX - initialLeft;
  const targetScale = 0.78; // match midScale so scale stays constant through sections 3-4

  // ── Progress landmarks ──
  const panelTwoStart = clamp((panelTwo.offsetTop - window.innerHeight * 0.6) / totalScrollable, 0, 1);
  const panelTwoEnd   = clamp((panelTwo.offsetTop + panelTwo.offsetHeight * 0.75) / totalScrollable, 0, 1);
  const panelTwoProgress = clamp(
    (progress - panelTwoStart) / Math.max(panelTwoEnd - panelTwoStart, 0.001),
    0, 1
  );

  // Float fades OUT as it "merges" into service card 1 (approaching panel-2)
  const svcFadeStart   = clamp((panelTwo.offsetTop - window.innerHeight * 0.55) / totalScrollable, 0, 1);
  const svcFadeEnd     = clamp((panelTwo.offsetTop + window.innerHeight * 0.35) / totalScrollable, 0, 1);
  // Float fades back IN as services section ends — start early since float is invisible
  // behind z-index 30 pin during fade, so there is no visual glitch from fading early
  const svcFadeInStart = clamp((panelThree.offsetTop - window.innerHeight * 1.5) / totalScrollable, 0, 1);
  const svcFadeInEnd   = clamp((panelThree.offsetTop - window.innerHeight * 0.4) / totalScrollable, 0, 1);

  const panelThreeEnd = clamp(
    (panelThree.offsetTop + panelThree.offsetHeight - window.innerHeight * 0.45) / totalScrollable,
    0, 1
  );
  const panelFourMid = clamp(
    (panelFour.offsetTop + panelFour.offsetHeight * 0.5) / totalScrollable,
    0, 1
  );
  const panelFourStart = clamp(
    (panelFour.offsetTop - window.innerHeight * 0.15) / totalScrollable,
    0, 1
  );
  const panelFourEnd = clamp(
    (panelFour.offsetTop + panelFour.offsetHeight * 0.9) / totalScrollable,
    0, 1
  );

  // Tower stays fully visible — locked at section 4, page scrolls past it.
  heroFloat.style.opacity = "1";

  // ── Transform calculation ──
  const straightenEase = Math.pow(panelTwoProgress, 1.25);
  let rotation = window.innerWidth <= MOBILE_BREAKPOINT ? 0 : -8 * (1 - straightenEase);

  const midScale = 0.78; // tower reduces to this scale through section 2; freeze holds it here
  const secondSectionScale = 1 - (1 - midScale) * straightenEase;
  const shrinkStart = 0.82;
  const shrinkProgress = clamp((progress - shrinkStart) / (1 - shrinkStart), 0, 1);
  const easedShrink = Math.pow(shrinkProgress, 1.8);
  let scale = secondSectionScale - (secondSectionScale - targetScale) * easedShrink;

  const isTabletViewport = window.innerWidth > 680 && window.innerWidth <= 1366;
  const isInSectionTwoOrThree = progress >= panelTwoStart && progress <= panelThreeEnd;
  if (isTabletViewport && isInSectionTwoOrThree) {
    scale *= 0.7;
  }

  const mergeProgress = clamp(
    (progress - panelFourStart) / Math.max(panelFourEnd - panelFourStart, 0.001),
    0, 1
  );
  const easedMerge = Math.pow(mergeProgress, 1.15);

  const driftIn  = clamp((progress - panelThreeEnd) / Math.max(panelFourMid - panelThreeEnd, 0.001), 0, 1);
  const driftOut = clamp((progress - panelFourMid)  / Math.max(panelFourEnd - panelFourMid,   0.001), 0, 1);

  // ── Y travel ──────────────────────────────────────────────────────
  // Three-phase viewport-anchored trajectory (desktop only):
  //   Phase 1 – Section 1:    gentle parallax
  //   Phase 2 – Sections 2–4: smooth smoothstep slide toward the section-4 lock position
  //                            (tower slides visibly through section 2, section 3, into s4)
  //   Phase 3 – After lock:   travelY constant → tower scrolls with page (exits above footer)
  // Mobile keeps the original formula (separate mobile block handles it).
  let travelY;
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    travelY = progress * Math.max(targetTranslateY, 0);
  } else {
    const navH        = topNav ? topNav.offsetHeight : 68;
    const s1EndScroll = svcFadeStart * totalScrollable;
    const _heroH      = heroFloat.offsetHeight || 900;
    const travelYAtS1End = svcFadeStart * Math.max(
      panelFour.offsetTop + panelFour.offsetHeight * 0.45 - initialTop - _heroH / 2, 0
    );
    const vLock = Math.max(navH + 10, Math.min((navH - s1EndScroll) + initialTop + travelYAtS1End, navH + 160) - 400);

    if (scrollYpx <= s1EndScroll) {
      travelY = progress * Math.max(targetTranslateY, 0);
    } else {
      const heroOffset = (navH - scrollYpx) + initialTop + (1 - scale) * _heroH / 2;
      travelY = vLock - heroOffset;
    }
  }

  const baseDrift = 92 * Math.pow(driftIn, 1.15) * (1 - Math.pow(driftOut, 1.1));
  let xShift = baseDrift + (targetTranslateX - baseDrift) * easedMerge;
  // Desktop: X eases from landing offset (120px right of centre) to viewport centre,
  // completing exactly at section 3 entry so the freeze picks up at centre with no jump.
  // Any position change happens during section 2 (hidden behind the services slider).
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    const xMergeEnd = Math.max(panelThree.offsetTop / totalScrollable, panelTwoStart + 0.001);
    const xMergeRaw = clamp((progress - panelTwoStart) / Math.max(xMergeEnd - panelTwoStart, 0.001), 0, 1);
    const easedXMerge = xMergeRaw * xMergeRaw * (3 - 2 * xMergeRaw); // smoothstep
    const desktopStartX = -HERO_BASE_LEFT_OFFSET + 120; // 120px right of centre in landing
    xShift = desktopStartX + (-HERO_BASE_LEFT_OFFSET - desktopStartX) * easedXMerge;
    // easedXMerge=0 → xShift=desktopStartX (right side, landing)
    // easedXMerge=1 → xShift=-HERO_BASE_LEFT_OFFSET (centre, matches frozenX → no jump at s3)
  }

  // Y is fully handled by travelY; no additional easedMerge blend needed
  const yShift = travelY;

  // ── Mobile-specific path ──
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    const isTargetPhone = window.innerWidth <= 430 && window.innerHeight >= 700 && window.innerHeight <= 980;
    const mobilePanelThreeStart = clamp((panelThree.offsetTop - window.innerHeight * 0.9) / totalScrollable, 0, 1);
    const panelThreeFinish = clamp(
      (panelThree.offsetTop + panelThree.offsetHeight - window.innerHeight * 0.05) / totalScrollable,
      0, 1
    );
    const sectionThreeProgress = clamp(
      (progress - mobilePanelThreeStart) / Math.max(panelThreeFinish - mobilePanelThreeStart, 0.001),
      0, 1
    );

    if (progress < mobilePanelThreeStart) {
      xShift -= isTargetPhone ? 35 : 20;
    }

    if (sectionThreeProgress > 0) {
      const easeInLeft  = clamp(sectionThreeProgress / 0.24, 0, 1);
      const smoothLeft  = easeInLeft * easeInLeft * (3 - 2 * easeInLeft);
      const leftHold    = (isTargetPhone ? -30 : -25) * smoothLeft;
      const rightStart  = isTargetPhone ? 0.2 : 0.3;
      const rightWindow = isTargetPhone ? 0.36 : 0.45;
      const easeToRight = clamp((sectionThreeProgress - rightStart) / rightWindow, 0, 1);
      const smoothRight = easeToRight * easeToRight * (3 - 2 * easeToRight);
      const rightTravel = (isTargetPhone ? 230 : 270) * smoothRight;
      xShift += leftHold + rightTravel;
    }

    if (progress < panelThreeEnd) {
      mobileFreezePoint = null;
    }

    if (progress >= panelThreeEnd) {
      if (!mobileFreezePoint) {
        mobileFreezePoint = { x: xShift, y: yShift, rotation, scale };
      }
      const lockedScale = Math.max(mobileFreezePoint.scale, 0.72);

      if (progress >= panelFourStart) {
        // Section 4 mobile: frozen viewport position — stays here, page scrolls past
        const lockTargetX = Math.round(frameRect.width * 0.60) - initialLeft + 400;
        const fixedVpY    = window.innerHeight * 0.30;
        const lockTargetY = scrollYpx + fixedVpY - initialTop;
        heroFloat.style.transform = `translate3d(calc(-50% + ${lockTargetX}px), ${lockTargetY}px, 0) rotate(0deg) scale(${lockedScale})`;
        return;
      }

      // Between panelThreeEnd and panelFourStart: glide toward lock position
      const lockTargetX  = Math.round(frameRect.width * 0.60) - initialLeft;
      const fixedVpY     = window.innerHeight * 0.30;
      const lockTargetY  = scrollYpx + fixedVpY - initialTop;
      heroFloat.style.transform = `translate3d(calc(-50% + ${lockTargetX}px), ${lockTargetY}px, 0) rotate(${rotation}deg) scale(${lockedScale})`;
      return;
    }
  }

  if (mergeProgress >= 1) {
    rotation = 0;
    scale = targetScale;
  }

  // ── Desktop: lock at 40% of section 4 and stay there forever. ──
  //    frozenTravelY grows 1:1 with scrollYpx so the visual position
  //    (frameRect.top + initialTop + frozenTravelY) stays constant = navH + vpYAtLock.
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    const navH        = topNav ? topNav.offsetHeight : 68;
    const frozenScale = isTabletViewport ? midScale * 0.7 : midScale;
    const _heroH_frz  = heroFloat.offsetHeight || 900;
    // vLock_frz: stable Phase-1 exit position — uses offsetTop not live BoundingClientRect.
    const _s1End_frz  = svcFadeStart * totalScrollable;
    const _s1TY_frz   = svcFadeStart * Math.max(
      panelFour.offsetTop + panelFour.offsetHeight * 0.45 - initialTop - _heroH_frz / 2, 0
    );
    const vLock_frz   = Math.max(navH + 10, Math.min((navH - _s1End_frz) + initialTop + _s1TY_frz, navH + 160) - 400);
    const vpYAtLock   = vLock_frz - navH - (1 - frozenScale) * _heroH_frz / 2;
    const s4LockP     = clamp((panelFour.offsetTop + panelFour.offsetHeight * 0.4) / totalScrollable, 0, 1);

    if (progress >= s4LockP) {
      const frozenTravelY = vpYAtLock + scrollYpx - initialTop;
      heroFloat.style.transform = `translate3d(calc(-50% + ${-HERO_BASE_LEFT_OFFSET}px), ${frozenTravelY}px, 0) rotate(0deg) scale(${frozenScale})`;
      return;
    }
  }

  heroFloat.style.transform = `translate3d(calc(-50% + ${xShift}px), ${yShift}px, 0) rotate(${rotation}deg) scale(${scale})`;
};

/* ── Unified scroll handler ──────────────────────── */
const onScroll = () => {
  updateServiceCards();
  animateHero();
};

/* ── Nav toggle + sidebar overlay ───────────────────────── */
if (navToggle && topNav) {
  // Create overlay backdrop (styled in site-shared.css as .nav-overlay)
  const navOverlay = document.createElement("div");
  navOverlay.className = "nav-overlay";
  (stage || document.body).appendChild(navOverlay);

  const openNav = () => {
    topNav.classList.add("menu-open");
    navToggle.setAttribute("aria-expanded", "true");
    navOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  const closeNav = () => {
    topNav.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
    navOverlay.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  navToggle.addEventListener("click", () => {
    topNav.classList.contains("menu-open") ? closeNav() : openNav();
  });
  navOverlay.addEventListener("click", closeNav);

  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) closeNav();
  });
}

if (heroFloat) {
  heroFloat.addEventListener("error", () => {
    heroFloat.src = "./IMG_8376.PNG";
  });
}

/* ── Mobile services swipe arrow (right only) ───────────────── */
(function () {
  const servicesPin = document.querySelector(".services-pin");
  const cardArea    = document.getElementById("services-card-area");
  if (!servicesPin || !cardArea) return;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "sc-swipe-arrow";
  nextBtn.setAttribute("aria-label", "Next service");
  nextBtn.innerHTML = "&#8250;"; /* › single right chevron */
  servicesPin.appendChild(nextBtn);

  nextBtn.addEventListener("click", () => {
    cardArea.scrollBy({ left: cardArea.offsetWidth, behavior: "smooth" });
  });

  const syncArrow = () => {
    const maxScroll = cardArea.scrollWidth - cardArea.offsetWidth;
    nextBtn.style.display = cardArea.scrollLeft >= maxScroll - 2 ? "none" : "flex";
  };

  cardArea.addEventListener("scroll", syncArrow, { passive: true });
  window.addEventListener("resize", syncArrow);
  syncArrow();
})();

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
window.addEventListener("load", onScroll);
