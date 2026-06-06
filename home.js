const stage = document.getElementById("story-stage");
const heroFloat = document.getElementById("hero-float");
const starProducts = document.getElementById("star-products");
const panelTwo = document.querySelector(".panel-2");
const panelThree = document.querySelector(".panel-3");
const panelFour = document.querySelector(".panel-4");
const storyFrame = document.querySelector(".story-frame");
const navToggle = document.querySelector(".nav-toggle");
const topNav = document.querySelector(".top-nav");
const HERO_BASE_LEFT_OFFSET = 55;
const HERO_BASE_TOP_VH = 18;
const HERO_BASE_TOP_PX_ADJUST = -45;
const MOBILE_BREAKPOINT = 980;
let mobileFreezePoint = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const animateHero = () => {
  if (!stage || !heroFloat || !starProducts || !panelTwo || !panelThree || !panelFour || !storyFrame) return;

  const rect = stage.getBoundingClientRect();
  const frameRect = storyFrame.getBoundingClientRect();
  const totalScrollable = rect.height - window.innerHeight;
  const rawProgress = totalScrollable > 0 ? -rect.top / totalScrollable : 0;
  const progress = clamp(rawProgress, 0, 1);

  const initialTop = window.innerHeight * (HERO_BASE_TOP_VH / 100) + HERO_BASE_TOP_PX_ADJUST;
  const initialLeft = frameRect.width / 2 + HERO_BASE_LEFT_OFFSET;
  const heroHeight = heroFloat.offsetHeight || heroFloat.getBoundingClientRect().height;
  const mergeTargetImageSelector = ".star-product:nth-child(4) img";
  const mergeTargetImage = starProducts.querySelector(mergeTargetImageSelector);
  const rightMostRect = mergeTargetImage
    ? mergeTargetImage.getBoundingClientRect()
    : starProducts.getBoundingClientRect();
  const targetCenterY = rightMostRect.top - frameRect.top + rightMostRect.height / 2;
  const targetCenterX = rightMostRect.left - frameRect.left + rightMostRect.width / 2;
  const targetTranslateY = targetCenterY - (initialTop + heroHeight / 2);
  const targetTranslateX = targetCenterX - initialLeft;
  const starReferenceImage = starProducts.querySelector(".star-product img");
  const targetVisualHeight = starReferenceImage
    ? starReferenceImage.getBoundingClientRect().height
    : 135;
  const targetScale = clamp(targetVisualHeight / heroHeight, 0.24, 1);
  const panelTwoStart = clamp((panelTwo.offsetTop - window.innerHeight * 0.6) / totalScrollable, 0, 1);
  const panelTwoEnd = clamp((panelTwo.offsetTop + panelTwo.offsetHeight * 0.75) / totalScrollable, 0, 1);
  const panelTwoProgress = clamp(
    (progress - panelTwoStart) / Math.max(panelTwoEnd - panelTwoStart, 0.001),
    0,
    1
  );
  const panelThreeEnd = clamp(
    (panelThree.offsetTop + panelThree.offsetHeight - window.innerHeight * 0.45) / totalScrollable,
    0,
    1
  );
  const panelFourMid = clamp(
    (panelFour.offsetTop + panelFour.offsetHeight * 0.5) / totalScrollable,
    0,
    1
  );
  const panelFourStart = clamp((panelFour.offsetTop - window.innerHeight * 0.15) / totalScrollable, 0, 1);
  const starStart = clamp((starProducts.offsetTop - window.innerHeight * 0.35) / totalScrollable, 0, 1);
  const driftIn = clamp(
    (progress - panelThreeEnd) / Math.max(panelFourMid - panelThreeEnd, 0.001),
    0,
    1
  );
  const driftOut = clamp(
    (progress - panelFourMid) / Math.max(starStart - panelFourMid, 0.001),
    0,
    1
  );

  const travelY = progress * Math.max(targetTranslateY, 0);
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
    // Keep the floating asset visually smaller only in section 2/3 on tablets.
    scale *= 0.7;
  }
  const mergeProgress = clamp(
    (progress - panelFourStart) / Math.max(starStart - panelFourStart, 0.001),
    0,
    1
  );
  const easedMerge = Math.pow(mergeProgress, 1.15);
  const baseDrift = 92 * Math.pow(driftIn, 1.15) * (1 - Math.pow(driftOut, 1.1));
  let xShift = baseDrift + (targetTranslateX - baseDrift) * easedMerge;
  const yShift = travelY + (targetTranslateY - travelY) * easedMerge;

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    const isTargetPhone = window.innerWidth <= 430 && window.innerHeight >= 700 && window.innerHeight <= 980;
    const mobilePanelThreeStart = clamp((panelThree.offsetTop - window.innerHeight * 0.9) / totalScrollable, 0, 1);
    const panelThreeFinish = clamp(
      (panelThree.offsetTop + panelThree.offsetHeight - window.innerHeight * 0.05) / totalScrollable,
      0,
      1
    );
    const sectionThreeProgress = clamp(
      (progress - mobilePanelThreeStart) / Math.max(panelThreeFinish - mobilePanelThreeStart, 0.001),
      0,
      1
    );

    // Section 2 framing: keep the floating asset 20px more to the left.
    if (progress < mobilePanelThreeStart) {
      xShift -= isTargetPhone ? 35 : 20;
    }

    if (sectionThreeProgress > 0) {
      // Smoothstep easing avoids a visible jump between section 2 -> section 3.
      const easeInLeft = clamp(sectionThreeProgress / 0.24, 0, 1);
      const smoothLeft = easeInLeft * easeInLeft * (3 - 2 * easeInLeft);
      const leftHold = (isTargetPhone ? -30 : -25) * smoothLeft;

      // Second-half drift to the right, also eased.
      const rightStart = isTargetPhone ? 0.2 : 0.3;
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
      heroFloat.style.transform = `translate3d(calc(-50% + ${mobileFreezePoint.x}px), ${mobileFreezePoint.y}px, 0) rotate(${mobileFreezePoint.rotation}deg) scale(${mobileFreezePoint.scale})`;
      return;
    }

    // Mobile: keep current path through section 3, then stop in section 4 beside the large copy.
    const panelFourLockStart = panelThreeEnd;
    if (progress >= panelFourLockStart) {
      // Mobile lock target tuned to match desired section-4 composition.
      const desiredPhoneCenterX = frameRect.width * 0.88 - 200;
      const panelFourTargetCenterX = isTargetPhone ? desiredPhoneCenterX : frameRect.width * 0.78 + 90;
      const panelFourTargetCenterY = isTargetPhone
        ? panelFour.offsetTop + panelFour.offsetHeight * 0.55 - 800
        : panelFour.offsetTop + panelFour.offsetHeight * 0.55 + 600;
      const lockTargetX = panelFourTargetCenterX - initialLeft;
      const lockTargetY = panelFourTargetCenterY - (initialTop + heroHeight / 2);
      const lockedScale = Math.max(scale, 0.72);
      heroFloat.style.transform = `translate3d(calc(-50% + ${lockTargetX}px), ${lockTargetY}px, 0) rotate(${rotation}deg) scale(${lockedScale})`;
      return;
    }
  }

  // Ensure exact visual merge into the right-most product once merge window completes.
  if (mergeProgress >= 1) {
    rotation = 0;
    scale = targetScale;
  }

  // Fade out hero-float as it fully merges so the actual product card takes over
  // (allows hover effects on Spira to work without dual-image artefact)
  heroFloat.style.opacity = mergeProgress >= 0.92 ? String(Math.max(0, 1 - (mergeProgress - 0.92) / 0.08)) : '1';

  heroFloat.style.transform = `translate3d(calc(-50% + ${xShift}px), ${yShift}px, 0) rotate(${rotation}deg) scale(${scale})`;
};

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

window.addEventListener("scroll", animateHero, { passive: true });
window.addEventListener("resize", animateHero);
window.addEventListener("load", animateHero);
