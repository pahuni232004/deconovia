const revealEls = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
  }
);

revealEls.forEach((el) => observer.observe(el));

/* All-products hero: first scroll shifts tower, next scroll moves page */
const productsHero = document.getElementById("products-hero");
if (productsHero) {
  let heroStage = 0; // 0=center, 1=tower right
  let touchStartY = null;

  const applyHeroStage = () => {
    productsHero.classList.toggle("is-shifted", heroStage >= 1);
  };

  const heroCanCaptureScroll = () => {
    const r = productsHero.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > window.innerHeight * 0.35;
  };

  const advanceHeroStage = () => {
    if (heroStage < 1) {
      heroStage += 1;
      applyHeroStage();
      return true;
    }
    return false;
  };

  window.addEventListener(
    "wheel",
    (ev) => {
      if (!heroCanCaptureScroll()) return;
      if (ev.deltaY <= 0) return;
      if (heroStage === 0 && advanceHeroStage()) {
        ev.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "touchstart",
    (ev) => {
      touchStartY = ev.touches && ev.touches[0] ? ev.touches[0].clientY : null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (ev) => {
      if (!heroCanCaptureScroll()) return;
      if (touchStartY == null || !ev.touches || !ev.touches[0]) return;
      const dy = touchStartY - ev.touches[0].clientY;
      if (dy > 24 && heroStage === 0 && advanceHeroStage()) {
        ev.preventDefault();
        touchStartY = null;
      }
    },
    { passive: false }
  );

  const resetHeroAtTop = () => {
    if (window.scrollY <= 2) {
      heroStage = 0;
      applyHeroStage();
    }
  };
  window.addEventListener("scroll", resetHeroAtTop, { passive: true });
  applyHeroStage();
}

/* Product listing: search + type filter (all-products.html) */
const productGrid = document.getElementById("product-grid");
const productSearchInput = document.getElementById("product-search");
const searchSubmit = document.getElementById("search-submit");

if (productGrid && productSearchInput) {
  const cards = () => Array.from(productGrid.querySelectorAll(".product-card"));

  const getCategory = (card) => {
    const img = card.querySelector(".product-card__media img");
    if (!img || !img.getAttribute("src")) return "plant";
    return img.src.toLowerCase().includes("tower") ? "tower" : "plant";
  };

  const getSearchBlob = (card) => card.textContent.toLowerCase();

  let activeFilter = "all";

  const applyProductFilters = () => {
    const q = productSearchInput.value.trim().toLowerCase();
    cards().forEach((card) => {
      const cat = getCategory(card);
      const matchFilter =
        activeFilter === "all" || activeFilter === cat;
      const matchSearch = !q || getSearchBlob(card).includes(q);
      card.hidden = !(matchFilter && matchSearch);
    });
  };

  productSearchInput.addEventListener("input", applyProductFilters);
  productSearchInput.addEventListener("search", applyProductFilters);
  if (searchSubmit) {
    searchSubmit.addEventListener("click", applyProductFilters);
  }

  document.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
      activeFilter = btn.dataset.filter || "all";
      applyProductFilters();
    });
  });
}

/* Placeholder art when PNG assets are missing (paths use spaces / local files) */
const IMG_FALLBACK_TOWER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1f5c3d"/><stop offset="100%" stop-color="#0d281a"/></linearGradient></defs><rect width="320" height="400" fill="#06120c"/><ellipse cx="160" cy="360" rx="100" ry="24" fill="#0c2218"/><path fill="url(#g)" d="M160 32 L240 160 L240 360 L80 360 L80 160 Z"/></svg>`
  );
const IMG_FALLBACK_PLANT =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><defs><linearGradient id="p" x1="50%" y1="100%" x2="50%" y2="0%"><stop offset="0%" stop-color="#0d281a"/><stop offset="100%" stop-color="#2d8f55"/></linearGradient></defs><rect width="320" height="400" fill="#06120c"/><ellipse cx="160" cy="340" rx="70" ry="18" fill="#0c2218"/><path fill="url(#p)" d="M160 280 Q100 200 120 120 Q160 60 200 120 Q220 200 160 280 Z"/><ellipse cx="160" cy="300" rx="24" ry="8" fill="#1a4d32"/></svg>`
  );

document.querySelectorAll(".product-card__media img").forEach((img) => {
  img.addEventListener(
    "error",
    () => {
      const src = (img.getAttribute("src") || "").toLowerCase();
      img.src = src.includes("tower") ? IMG_FALLBACK_TOWER : IMG_FALLBACK_PLANT;
    },
    { once: true }
  );
});

document.querySelectorAll(".product-card").forEach((card) => {
  if (card.dataset.productId) return;
  const link = card.querySelector(".product-card__link[href*='product=']");
  if (!link) return;
  try {
    const u = new URL(link.href, window.location.href);
    const id = u.searchParams.get("product");
    if (id) card.dataset.productId = id;
  } catch (_) {
    /* ignore */
  }
});

async function fetchOfferMap() {
  try {
    const res = await fetch("/api/products", { method: "GET", credentials: "include" });
    const data = await res.json().catch(() => null);
    const map = {};
    const list = Array.isArray(data?.products) ? data.products : [];
    list.forEach((p) => {
      if (p?.productKey && p?.offer?.active && Number(p?.offer?.pct)) {
        map[p.productKey] = p.offer;
      }
    });
    return map;
  } catch {
    return {};
  }
}

function applyOfferTags(offersMap = {}) {
  const offers = offersMap && typeof offersMap === "object" ? offersMap : {};
  document.querySelectorAll(".product-card").forEach((card) => {
    const id = card.dataset.productId;
    const offer = id ? offers[id] : null;
    const prev = card.querySelector(".product-card__offer");
    if (!offer || !offer.active || !Number(offer.pct)) {
      if (prev) prev.remove();
      return;
    }
    const text = String(offer.label || `${offer.pct}% OFF`).trim();
    if (prev) {
      prev.textContent = text;
      return;
    }
    const tag = document.createElement("span");
    tag.className = "product-card__offer";
    tag.textContent = text;
    card.appendChild(tag);
  });
}

document.getElementById("product-grid")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".product-cart");
  const card = e.target.closest(".product-card");
  if (!card) return;

  // 1) Cart action
  if (btn && typeof window.addToCart === "function") {
    e.preventDefault();
    e.stopPropagation();

    // Always derive product id from the card link to avoid dataset mismatches.
    const link = card.querySelector(".product-card__link[href*='product=']");
    if (!link) return;
    let id = card.dataset.productId;
    try {
      const u = new URL(link.href, window.location.href);
      id = u.searchParams.get("product") || id;
    } catch (_) {
      /* ignore */
    }

    if (!id) return;
    Promise.resolve(window.addToCart(id, 1)).then((ok) => {
      if (typeof window.showCartToast === "function") {
        window.showCartToast(ok ? "Added to cart" : "Could not add to cart");
      }
    });
    return;
  }

  // 2) Card navigation (overlay link has pointer-events none)
  const link = card.querySelector(".product-card__link[href*='product=']");
  if (link) window.location.href = link.href;
});

/* Append admin-added products to all-products grid */
if (productGrid && window.PRODUCT_CATALOG) {
  const existing = new Set(
    Array.from(productGrid.querySelectorAll(".product-card"))
      .map((card) => card.dataset.productId)
      .filter(Boolean)
  );
  Object.entries(window.PRODUCT_CATALOG).forEach(([id, p]) => {
    if (existing.has(id)) return;
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = id;
    card.innerHTML = `
      <a class="product-card__link" href="./individual-product.html?product=${encodeURIComponent(id)}" aria-label="View ${p.name}"></a>
      <div class="product-card__media"><img src="${p.img}" alt="${p.name}" /></div>
      <div class="product-card__body">
        <h3>${p.name}</h3>
        <p>${p.desc || "Admin added product."}</p>
        <div class="product-foot">
          <strong>${p.price}</strong>
          <button type="button" class="product-cart" aria-label="Add ${p.name} to cart">🛒</button>
        </div>
      </div>
    `;
    const img = card.querySelector(".product-card__media img");
    img?.addEventListener(
      "error",
      () => {
        const src = (img.getAttribute("src") || "").toLowerCase();
        img.src = src.includes("tower") ? IMG_FALLBACK_TOWER : IMG_FALLBACK_PLANT;
      },
      { once: true }
    );
    productGrid.appendChild(card);
  });
}

fetchOfferMap().then((map) => applyOfferTags(map));
