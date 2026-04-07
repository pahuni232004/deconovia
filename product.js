const products = window.PRODUCT_CATALOG || {};

const API_BASE = "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/** Shown when ./3D tower .png (or catalog img) is missing — workspace has no PNGs by default */
const TOWER_IMAGE_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">
      <defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1f5c3d"/><stop offset="100%" stop-color="#0d281a"/>
      </linearGradient></defs>
      <rect width="480" height="600" fill="#06120c"/>
      <ellipse cx="240" cy="540" rx="140" ry="32" fill="#0c2218"/>
      <path fill="url(#a)" d="M240 48 L340 200 L340 520 L140 520 L140 200 Z"/>
      <path fill="#3d8f5f" fill-opacity="0.35" d="M240 80 L300 200 L300 480 L180 480 L180 200 Z"/>
    </svg>`
  );

function bindImageFallback(img) {
  if (!img) return;
  img.addEventListener(
    "error",
    () => {
      img.src = TOWER_IMAGE_FALLBACK;
    },
    { once: true }
  );
}

function getProductImages(p) {
  const arr = Array.isArray(p?.imgs) ? p.imgs.filter(Boolean) : [];
  if (arr.length) return arr;
  return p?.img ? [p.img] : [];
}

function renderImageGrid(images, mainImgEl, productName) {
  const grid = document.getElementById("product-image-grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!images.length) {
    grid.style.display = "none";
    return;
  }
  grid.style.display = "";
  images.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `product-thumb${idx === 0 ? " is-active" : ""}`;
    btn.setAttribute("aria-label", `View image ${idx + 1}`);
    const img = document.createElement("img");
    bindImageFallback(img);
    img.src = src;
    img.alt = `${productName || "Product"} preview ${idx + 1}`;
    btn.appendChild(img);
    btn.addEventListener("click", () => {
      if (mainImgEl) {
        mainImgEl.src = src;
      }
      grid.querySelectorAll(".product-thumb").forEach((el) => el.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
    grid.appendChild(btn);
  });
}

function getRecommendedKeys(currentKey) {
  const all = Object.keys(products);
  return all.filter((k) => k !== currentKey).slice(0, 3);
}

async function fetchReviews(productKey) {
  try {
    const data = await apiFetch(
      `/api/products/${encodeURIComponent(productKey)}/reviews`,
      { method: "GET" }
    );
    return Array.isArray(data?.reviews) ? data.reviews : [];
  } catch {
    return [];
  }
}

function renderStars(n) {
  const full = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return full + empty;
}

async function renderReviews(productKey, sampleReviews) {
  const listEl = document.getElementById("review-list");
  const emptyEl = document.getElementById("review-empty");
  if (!listEl) return;

  const stored = await fetchReviews(productKey);
  const items = stored.length ? stored : sampleReviews ? [...sampleReviews] : [];
  listEl.innerHTML = "";

  if (!items.length) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  items.forEach((r) => {
    const rating = Math.min(5, Math.max(1, Number(r.rating) || 5));
    const author = (r.author || "Customer").trim();
    const initial = author.charAt(0).toUpperCase() || "?";
    const li = document.createElement("li");
    li.className = "review-item";
    li.innerHTML = `
      <div class="review-item__layout">
        <div class="review-item__avatar" aria-hidden="true"></div>
        <div class="review-item__content">
          <div class="review-item__meta">
            <span class="review-item__author"></span>
            <span class="review-item__stars" aria-label="${rating} out of 5 stars"></span>
            <time class="review-item__date" datetime=""></time>
          </div>
          <p class="review-item__body"></p>
        </div>
      </div>
    `;
    li.querySelector(".review-item__avatar").textContent = initial;
    li.querySelector(".review-item__author").textContent = author;
    li.querySelector(".review-item__stars").textContent = renderStars(rating);
    const timeEl = li.querySelector(".review-item__date");
    timeEl.textContent = r.date || "";
    timeEl.dateTime = r.date || "";
    li.querySelector(".review-item__body").textContent = r.body || "";
    listEl.appendChild(li);
  });
}

function renderRecommended(currentKey) {
  const grid = document.getElementById("recommended-grid");
  if (!grid) return;

  grid.innerHTML = "";
  getRecommendedKeys(currentKey).forEach((k) => {
    const p = products[k];
    if (!p) return;
    const a = document.createElement("a");
    a.className = "rec-card";
    a.href = `./individual-product.html?product=${encodeURIComponent(k)}`;

    const stage = document.createElement("div");
    stage.className = "rec-card__stage";
    const img = document.createElement("img");
    bindImageFallback(img);
    img.src = p.img;
    img.alt = p.name;
    img.loading = "lazy";
    stage.appendChild(img);

    const body = document.createElement("div");
    body.className = "rec-card__body";
    const name = document.createElement("span");
    name.className = "rec-card__name";
    name.textContent = p.name;
    const price = document.createElement("span");
    price.className = "rec-card__price";
    price.textContent = p.price;
    body.append(name, price);

    const hint = document.createElement("span");
    hint.className = "rec-card__hint";
    hint.textContent = "View product";

    a.append(stage, body, hint);
    grid.appendChild(a);
  });
}

const params = new URLSearchParams(window.location.search);
const key = params.get("product") || "tower-1";
const data = products[key] || products["tower-1"] || {};

const nameEl = document.getElementById("product-name");
const priceEl = document.getElementById("product-price");
const descEl = document.getElementById("product-desc");
const imgEl = document.getElementById("product-image");
const detailLongEl = document.getElementById("product-detail-long");
const includedEl = document.getElementById("product-included");
const materialEl = document.getElementById("product-material");

if (nameEl) nameEl.textContent = data.name ?? "";
if (priceEl) priceEl.textContent = data.price ?? "";
if (descEl) descEl.textContent = data.desc ?? "";
if (imgEl) {
  bindImageFallback(imgEl);
  const images = getProductImages(data);
  imgEl.src = images[0] || data.img || "";
  imgEl.alt = data.name ?? "";
  renderImageGrid(images, imgEl, data.name ?? "Product");
}
if (detailLongEl) detailLongEl.textContent = data.detailLong || "";
if (materialEl) materialEl.textContent = data.material || "";

if (includedEl) {
  includedEl.innerHTML = "";
  (data.included || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    includedEl.appendChild(li);
  });
}

renderReviews(key, data.sampleReviews);
renderRecommended(key);

const reviewForm = document.getElementById("review-form");
if (reviewForm) {
  reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(reviewForm);
    const author = String(fd.get("author") || "").trim();
    const body = String(fd.get("body") || "").trim();
    const rating = Number(fd.get("rating") || 5);
    if (!author || !body) return;

    const entry = {
      author,
      body,
      rating,
      date: new Date().toISOString().slice(0, 10),
    };

    apiFetch(`/api/products/${encodeURIComponent(key)}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        author: entry.author,
        rating: entry.rating,
        body: entry.body,
      }),
    })
      .then(() => renderReviews(key, data.sampleReviews))
      .then(() => reviewForm.reset())
      .catch(() => {
        /* If review save fails, keep user input for retry */
      });
  });
}
