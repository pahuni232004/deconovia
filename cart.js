/**
 * Cart — localStorage, requires catalog.js (PRODUCT_CATALOG)
 */
const CART_STORAGE_KEY = "decor-aeroponic-cart-v1";

// API-backed cart cache (initially empty until first refresh).
let API_BASE =
  (window && window.__DECOR_API_BASE) ||
  localStorage.getItem("decor-aeroponic-api-base") ||
  (window.location.protocol === "file:" ? "http://localhost:3001" : "");

async function apiFetch(path, options = {}) {
  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  }).catch(() => null);

  if ((!res || res.status === 501 || res.status === 404) && !API_BASE) {
    API_BASE = "http://localhost:3001";
    try {
      localStorage.setItem("decor-aeroponic-api-base", API_BASE);
    } catch {
      /* ignore */
    }
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }).catch(() => null);
  }

  if (!res) throw new Error("Backend unavailable");
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

let cartCache = [];
let cartCacheLoaded = false;

async function refreshCartCache() {
  const data = await apiFetch("/api/cart", { method: "GET" });
  const items = Array.isArray(data?.items) ? data.items : [];
  cartCache = items.map((it) => ({
    productId: it.productId,
    qty: it.qty,
    name: it.name,
    productKey: it.productKey || it.productId,
    priceLabel: it.price || it.priceLabel || "",
    priceCents: it.priceCents ?? 0,
    priceAmount: (it.priceCents ?? 0) / 100,
    img: it.img || "",
    inventory: it.inventory ?? 0,
  }));
  cartCacheLoaded = true;
  emitCartUpdated();
}

function getStockFor(productId) {
  const inv = window.PRODUCT_INVENTORY || {};
  const n = Number(inv[productId]);
  // If inventory entry is missing (or invalid), default to demo stock.
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 25;
}

function parsePriceToNumber(priceLabel) {
  const digits = String(priceLabel || "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatRs(n) {
  return `Rs. ${n.toLocaleString("en-IN")}/-`;
}

function loadCartRaw() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartRaw(lines) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

/**
 * Raw lines: { productId: string, qty: number }
 */
function normalizeCartLines(raw) {
  const cat = window.PRODUCT_CATALOG;
  if (!cat) return [];
  return raw
    .filter((l) => l && l.productId && cat[l.productId])
    .map((l) => {
      const p = cat[l.productId];
      const stock = getStockFor(l.productId);
      const qty = Math.min(stock, 99, Math.max(1, Math.floor(Number(l.qty) || 1)));
      const priceAmount = parsePriceToNumber(p.price);
      return {
        productId: l.productId,
        qty,
        name: p.name,
        priceLabel: p.price,
        priceAmount,
        img: p.img,
      };
      };
    })
    .filter((l) => l.qty > 0);
}

function getCartLines() {
  return cartCacheLoaded ? cartCache : normalizeCartLines(loadCartRaw());
}

function getCartItemCount() {
  return getCartLines().reduce((sum, l) => sum + l.qty, 0);
}

function getCartSubtotal() {
  return getCartLines().reduce((sum, l) => sum + l.priceAmount * l.qty, 0);
}

function emitCartUpdated() {
  window.dispatchEvent(new CustomEvent("decor-cart-updated"));
}

function persistFromLines(lines) {
  const cat = window.PRODUCT_CATALOG;
  if (!cat) return;
  const raw = lines.map((l) => ({
    productId: l.productId,
    qty: l.qty,
  }));
  saveCartRaw(raw);
  emitCartUpdated();
}

async function addToCart(productId, qty = 1) {
  const key = String(productId || "").trim();
  if (!key) return false;
  const q = Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));
  try {
    await apiFetch("/api/cart/items", {
      method: "POST",
      body: JSON.stringify({ productKey: key, qty: q }),
    });
    await refreshCartCache();
    return true;
  } catch {
    // Fallback: keep cart usable even if API is temporarily unreachable.
    const cat = window.PRODUCT_CATALOG;
    if (!cat || !cat[key]) return false;
    const stock = getStockFor(key);
    if (stock <= 0) return false;
    const raw = loadCartRaw();
    const idx = raw.findIndex((l) => l.productId === key);
    if (idx >= 0) raw[idx].qty = Math.min(stock, 99, Math.floor(Number(raw[idx].qty) || 1) + q);
    else raw.push({ productId: key, qty: Math.min(stock, q) });
    saveCartRaw(raw);
    cartCacheLoaded = false;
    emitCartUpdated();
    return true;
  }
}

async function setLineQty(productId, qty) {
  const key = String(productId || "").trim();
  if (!key) return false;
  const q = Math.max(0, Math.min(99, Math.floor(Number(qty) || 0)));

  try {
    await apiFetch(`/api/cart/items/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ qty: q }),
    });
    await refreshCartCache();
    return true;
  } catch {
    const raw = loadCartRaw();
    const idx = raw.findIndex((l) => l.productId === key);
    const stock = getStockFor(key);
    const next = Math.min(stock, 99, Math.max(0, q));
    if (next === 0) {
      if (idx >= 0) raw.splice(idx, 1);
    } else if (idx >= 0) {
      raw[idx].qty = next;
    } else {
      raw.push({ productId: key, qty: next });
    }
    saveCartRaw(raw);
    cartCacheLoaded = false;
    emitCartUpdated();
    return true;
  }
}

async function removeLine(productId) {
  return setLineQty(productId, 0);
}

async function clearCart() {
  try {
    const lines = getCartLines();
    await Promise.allSettled(
      lines.map((l) =>
        apiFetch(`/api/cart/items/${encodeURIComponent(l.productId)}`, { method: "DELETE" }).catch(() => null)
      )
    );
    await refreshCartCache();
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    cartCacheLoaded = false;
    emitCartUpdated();
  }
}

function updateCartBadges() {
  const n = getCartItemCount();
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = n > 0 ? String(n) : "";
    el.hidden = n === 0;
    el.setAttribute("aria-label", n === 0 ? "Cart is empty" : `${n} items in cart`);
  });
}

function showCartToast(message) {
  let t = document.getElementById("cart-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "cart-toast";
    t.className = "cart-toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.hidden = false;
  t.classList.add("cart-toast--show");
  clearTimeout(showCartToast._tid);
  showCartToast._tid = setTimeout(() => {
    t.classList.remove("cart-toast--show");
    t.hidden = true;
  }, 2200);
}

function initAddToCartProductPage() {
  const btn = document.getElementById("add-to-cart");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("product") || "tower-1";
    addToCart(key, 1).then((ok) => {
      showCartToast(ok ? "Added to cart" : "Could not add to cart");
    });
  });
}

function renderCartPage() {
  const tbody = document.getElementById("cart-lines-body");
  const emptyEl = document.getElementById("cart-empty");
  const subEl = document.getElementById("cart-subtotal");
  const checkoutBtn = document.getElementById("cart-checkout-btn");
  if (!tbody || !emptyEl) return;

  const lines = getCartLines();
  tbody.innerHTML = "";

  if (!lines.length) {
    emptyEl.hidden = false;
    if (subEl) subEl.textContent = formatRs(0);
    if (checkoutBtn) {
      checkoutBtn.classList.add("is-disabled");
      checkoutBtn.setAttribute("aria-disabled", "true");
    }
    return;
  }

  emptyEl.hidden = true;
  if (checkoutBtn) {
    checkoutBtn.classList.remove("is-disabled");
    checkoutBtn.removeAttribute("aria-disabled");
  }

  lines.forEach((line) => {
    const tr = document.createElement("tr");
    tr.dataset.productId = line.productId;
    const lineTotal = line.priceAmount * line.qty;
    tr.innerHTML = `
      <td class="cart-cell cart-cell--product">
        <div class="cart-line-product">
          <img src="" alt="" class="cart-line-img" width="72" height="72" />
          <div>
            <a class="cart-line-name" href="./individual-product.html?product=${encodeURIComponent(line.productId)}"></a>
            <p class="cart-line-unit">${line.priceLabel} each</p>
            <p class="cart-line-unit">Stock: ${Number.isFinite(line.inventory) ? line.inventory : getStockFor(line.productId)}</p>
          </div>
        </div>
      </td>
      <td class="cart-cell cart-cell--qty">
        <div class="cart-qty">
          <button type="button" class="cart-qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
          <input type="number" class="cart-qty-input" min="1" max="99" value="${line.qty}" aria-label="Quantity" />
          <button type="button" class="cart-qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
        </div>
      </td>
      <td class="cart-cell cart-cell--line">${formatRs(lineTotal)}</td>
      <td class="cart-cell cart-cell--remove">
        <button type="button" class="cart-remove-btn" aria-label="Remove item">Remove</button>
      </td>
    `;
    const img = tr.querySelector(".cart-line-img");
    img.src = line.img;
    img.alt = line.name;
    img.addEventListener("error", () => {
      img.removeAttribute("src");
      img.style.visibility = "hidden";
    });
    tr.querySelector(".cart-line-name").textContent = line.name;

    const input = tr.querySelector(".cart-qty-input");
    tr.querySelectorAll(".cart-qty-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const action = b.dataset.action;
        let v = parseInt(input.value, 10) || 1;
        if (action === "inc") v = Math.min(99, v + 1);
        else v = Math.max(1, v - 1);
        input.value = String(v);
        setLineQty(line.productId, v).finally(() => {
          renderCartPage();
          updateCartBadges();
        });
      });
    });
    input.addEventListener("change", () => {
      let v = parseInt(input.value, 10) || 1;
      v = Math.min(99, Math.max(1, v));
      input.value = String(v);
      setLineQty(line.productId, v).finally(() => {
        renderCartPage();
        updateCartBadges();
      });
    });

    tr.querySelector(".cart-remove-btn").addEventListener("click", () => {
      removeLine(line.productId).finally(() => {
        renderCartPage();
        updateCartBadges();
      });
    });

    tbody.appendChild(tr);
  });

  if (subEl) subEl.textContent = formatRs(getCartSubtotal());
}

function initCartPage() {
  if (!document.getElementById("cart-lines-body")) return;
  renderCartPage();
  window.addEventListener("decor-cart-updated", () => {
    renderCartPage();
    updateCartBadges();
  });

  const clearBtn = document.getElementById("cart-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (getCartLines().length && confirm("Remove all items from your cart?")) {
        clearCart().finally(() => {
          renderCartPage();
          updateCartBadges();
        });
      }
    });
  }
}

window.addToCart = addToCart;
window.removeCartLine = removeLine;
window.setCartLineQty = setLineQty;
window.getCartLines = getCartLines;
window.getCartSubtotal = getCartSubtotal;
window.getCartItemCount = getCartItemCount;
window.clearCart = clearCart;
window.formatRs = formatRs;
window.parsePriceToNumber = parsePriceToNumber;
window.showCartToast = showCartToast;

document.addEventListener("DOMContentLoaded", () => {
  refreshCartCache()
    .catch(() => {})
    .finally(() => {
      updateCartBadges();
      initAddToCartProductPage();
      initCartPage();
      window.addEventListener("decor-cart-updated", updateCartBadges);
    });
});
