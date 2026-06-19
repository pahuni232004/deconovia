const stage = document.getElementById("story-stage");
const heroFloat = document.getElementById("hero-float");
const panelTwo = document.querySelector(".panel-2");
const panelThree = document.querySelector(".panel-3");
const panelFour = document.querySelector(".panel-4");
const storyFrame = document.querySelector(".story-frame");
const navToggle = document.querySelector(".nav-toggle");
const topNav = document.querySelector(".top-nav");

// Service slider elements
const servicesSection = document.getElementById("services-section");
const serviceCards = document.querySelectorAll(".service-card");
const scDots = document.querySelectorAll(".sc-dot");

const HERO_BASE_LEFT_OFFSET = 145; // CSS must match: left: calc(50% + 145px)
const HERO_BASE_TOP_VH = 18;
const HERO_BASE_TOP_PX_ADJUST = -45;
const MOBILE_BREAKPOINT = 980;
let mobileFreezePoint = null;
let desktopFreezePoint = null;

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
  const targetScale = 0.52;

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

  // ── Opacity: float hides BEHIND slider via z-index (20 vs pin's 30).
  //    Opacity is 0 during services as belt-and-suspenders, then fades
  //    in smoothly as section 3 appears. No early return — transforms
  //    are always computed so position is correct at re-emergence. ──
  let floatOpacity = 1;
  if (progress >= svcFadeStart && progress < svcFadeInStart) {
    // Fully hidden (z-index covers it; opacity=0 prevents any edge bleed)
    floatOpacity = 0;
  } else if (progress >= svcFadeInStart && progress <= svcFadeInEnd) {
    // Smooth fade-in as section 3 comes into view
    floatOpacity = clamp(
      (progress - svcFadeInStart) / Math.max(svcFadeInEnd - svcFadeInStart, 0.001),
      0, 1
    );
  }
  heroFloat.style.opacity = String(floatOpacity);

  // ── Transform calculation ──
  const straightenEase = Math.pow(panelTwoProgress, 1.25);
  let rotation = window.innerWidth <= MOBILE_BREAKPOINT ? 0 : -8 * (1 - straightenEase);

  const midScale = 0.92;
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
  //   Phase 1 – Section 1:   gentle original parallax (short range, negligible drift)
  //   Phase 2 – Services:    smooth hidden interpolation from s1 exit → s3 entry
  //                          (tower is behind the sticky slider, so position is invisible)
  //   Phase 3 – S3 + S4:    drift gently from s3 entry position to s4 resting spot
  // Mobile keeps the original formula (separate mobile block handles it).
  let travelY;
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    travelY = progress * Math.max(targetTranslateY, 0);
  } else {
    // Transition boundary: where float starts going behind the slider
    const s1EndScroll    = svcFadeStart * totalScrollable;
    const travelYAtS1End = svcFadeStart * Math.max(targetTranslateY, 0);

    // Section 3 entry: scrollY = panelThree.offsetTop (s3 at top of viewport)
    const s3StartScroll  = panelThree.offsetTop;
    const vpYAtS3        = window.innerHeight * 0.28 - 350; // −350: lock 200px higher than before
    const travelYAtS3    = s3StartScroll + vpYAtS3 - initialTop;

    // Section 4 / end of page resting position
    const vpYAtEnd       = window.innerHeight * 0.38;
    const travelYAtEnd   = totalScrollable + vpYAtEnd - initialTop;

    if (scrollYpx <= s1EndScroll) {
      // Phase 1 – Section 1
      travelY = progress * Math.max(targetTranslateY, 0);
    } else if (scrollYpx <= s3StartScroll) {
      // Phase 2 – Services (hidden behind slider): slow smoothstep interpolation
      const svcRange = Math.max(s3StartScroll - s1EndScroll, 1);
      const svcP     = clamp((scrollYpx - s1EndScroll) / svcRange, 0, 1);
      const easedSvc = svcP * svcP * (3 - 2 * svcP);
      travelY = travelYAtS1End + (travelYAtS3 - travelYAtS1End) * easedSvc;
    } else {
      // Phase 3 – Sections 3 + 4: gentle drift to final resting position
      const s34Range = Math.max(totalScrollable - s3StartScroll, 1);
      const s34p     = clamp((scrollYpx - s3StartScroll) / s34Range, 0, 1);
      const easedS34 = s34p * s34p * (3 - 2 * s34p);
      travelY = travelYAtS3 + (travelYAtEnd - travelYAtS3) * easedS34;
    }
  }

  const baseDrift = 92 * Math.pow(driftIn, 1.15) * (1 - Math.pow(driftOut, 1.1));
  let xShift = baseDrift + (targetTranslateX - baseDrift) * easedMerge;
  // Desktop: section 3 tower appears at viewport center; drifts to 55% by section 4 end
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    xShift = -HERO_BASE_LEFT_OFFSET + (targetTranslateX + HERO_BASE_LEFT_OFFSET) * easedMerge;
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
        // Section 4 on mobile: lock at ~60% of viewport width (right side), mid-height
        const lockTargetX = Math.round(frameRect.width * 0.60) - initialLeft;
        const fixedVpY    = window.innerHeight * 0.30;
        const lockTargetY = scrollYpx + fixedVpY - initialTop;
        heroFloat.style.transform = `translate3d(calc(-50% + ${lockTargetX}px), ${lockTargetY}px, 0) rotate(0deg) scale(${lockedScale})`;
        return;
      }

      const panelFourLockStart = panelThreeEnd;
      if (progress >= panelFourLockStart) {
        const lockTargetX  = Math.round(frameRect.width * 0.60) - initialLeft;
        const fixedVpY     = window.innerHeight * 0.30;
        const lockTargetY  = scrollYpx + fixedVpY - initialTop;
        const lockedScaleInner = Math.max(scale, 0.72);
        heroFloat.style.transform = `translate3d(calc(-50% + ${lockTargetX}px), ${lockTargetY}px, 0) rotate(${rotation}deg) scale(${lockedScaleInner})`;
        return;
      }
    }
  }

  if (mergeProgress >= 1) {
    rotation = 0;
    scale = targetScale;
  }

  // ── Desktop: freeze tower as soon as section 3 reaches viewport top.
  //    The tower rises into place during the services exit (phase 2), then
  //    stays viewport-locked through all of sections 3 and 4. ──
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    const s3FreezeP = clamp(panelThree.offsetTop / totalScrollable, 0, 1);
    if (progress < s3FreezeP) {
      desktopFreezePoint = null;
    } else {
      if (!desktopFreezePoint) {
        desktopFreezePoint = { scrollY: scrollYpx, yShift, scale };
      }
      // travelY mirrors scrollYpx growth → visual Y stays constant
      const frozenTravelY = scrollYpx - desktopFreezePoint.scrollY + desktopFreezePoint.yShift;
      const frozenX = -HERO_BASE_LEFT_OFFSET;
      heroFloat.style.transform = `translate3d(calc(-50% + ${frozenX}px), ${frozenTravelY}px, 0) rotate(0deg) scale(${desktopFreezePoint.scale * 0.85})`;
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
  document.body.appendChild(navOverlay);

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

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
window.addEventListener("load", onScroll);
