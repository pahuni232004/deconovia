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

const HERO_BASE_LEFT_OFFSET = 55;
const HERO_BASE_TOP_VH = 18;
const HERO_BASE_TOP_PX_ADJUST = -45;
const MOBILE_BREAKPOINT = 980;
let mobileFreezePoint = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/* ── Service card stack reveal ───────────────────── */
const updateServiceCards = () => {
  if (!servicesSection || !serviceCards.length) return;

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

  // Final destination: settle in section 4 (right side of cta block)
  const finalRect = panelFour.getBoundingClientRect();
  const targetCenterY = finalRect.top - frameRect.top + finalRect.height * 0.45;
  const targetCenterX = finalRect.left - frameRect.left + finalRect.width * 0.72;
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
  // Float fades back IN approaching panel-3
  const svcFadeInStart = clamp((panelThree.offsetTop - window.innerHeight * 0.65) / totalScrollable, 0, 1);
  const svcFadeInEnd   = clamp((panelThree.offsetTop - window.innerHeight * 0.1) / totalScrollable, 0, 1);

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

  // ── Opacity: hide while in services section, re-emerge at section 3 ──
  let floatOpacity = 1;
  if (progress >= svcFadeStart && progress <= svcFadeEnd) {
    floatOpacity = 1 - clamp(
      (progress - svcFadeStart) / Math.max(svcFadeEnd - svcFadeStart, 0.001),
      0, 1
    );
  } else if (progress > svcFadeEnd && progress < svcFadeInStart) {
    floatOpacity = 0;
  } else if (progress >= svcFadeInStart && progress <= svcFadeInEnd) {
    floatOpacity = clamp(
      (progress - svcFadeInStart) / Math.max(svcFadeInEnd - svcFadeInStart, 0.001),
      0, 1
    );
  }

  heroFloat.style.opacity = String(floatOpacity);
  if (floatOpacity === 0) return;   // skip transform while invisible

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

  const travelY  = progress * Math.max(targetTranslateY, 0);
  const baseDrift = 92 * Math.pow(driftIn, 1.15) * (1 - Math.pow(driftOut, 1.1));
  let xShift = baseDrift + (targetTranslateX - baseDrift) * easedMerge;
  const yShift = travelY + (targetTranslateY - travelY) * easedMerge;

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
        const desiredPhoneCenterX = frameRect.width * 0.88 - 200;
        const panelFourTargetCenterX = isTargetPhone ? desiredPhoneCenterX : frameRect.width * 0.78 + 90;
        const panelFourTargetCenterY = panelFour.offsetTop + (isTargetPhone ? 420 : 540);
        const lockTargetX = panelFourTargetCenterX - initialLeft;
        const lockTargetY = panelFourTargetCenterY - (initialTop + heroHeight / 2);
        heroFloat.style.transform = `translate3d(calc(-50% + ${lockTargetX}px), ${lockTargetY}px, 0) rotate(${mobileFreezePoint.rotation}deg) scale(${lockedScale})`;
        return;
      }

      const panelFourLockStart = panelThreeEnd;
      if (progress >= panelFourLockStart) {
        const desiredPhoneCenterX = frameRect.width * 0.88 - 200;
        const panelFourTargetCenterX = isTargetPhone ? desiredPhoneCenterX : frameRect.width * 0.78 + 90;
        const panelFourTargetCenterY = isTargetPhone
          ? panelFour.offsetTop + panelFour.offsetHeight * 0.55 - 800
          : panelFour.offsetTop + panelFour.offsetHeight * 0.55 + 600;
        const lockTargetX = panelFourTargetCenterX - initialLeft;
        const lockTargetY = panelFourTargetCenterY - (initialTop + heroHeight / 2);
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

  heroFloat.style.transform = `translate3d(calc(-50% + ${xShift}px), ${yShift}px, 0) rotate(${rotation}deg) scale(${scale})`;
};

/* ── Unified scroll handler ──────────────────────── */
const onScroll = () => {
  updateServiceCards();
  animateHero();
};

/* ── Nav toggle ──────────────────────────────────── */
if (navToggle && topNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = topNav.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT && topNav.classList.contains("menu-open")) {
      topNav.classList.remove("menu-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
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
