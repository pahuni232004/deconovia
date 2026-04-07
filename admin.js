const ADMIN_PRODUCTS_KEY = "decor-aeroponic-admin-products";
const INVENTORY_KEY = "decor-aeroponic-product-inventory";
const ORDERS_KEY = "decor-aeroponic-orders";
const CONTACTS_KEY = "decor-aeroponic-user-contacts";
const INQUIRIES_KEY = "decor-aeroponic-contact-inquiries";
const USER_PROFILES_KEY = "decor-aeroponic-user-profiles";
const PHONE_CAMPAIGNS_KEY = "decor-aeroponic-phone-campaigns";
const OVERRIDES_KEY = "decor-aeroponic-product-overrides";
const OFFERS_KEY = "decor-aeroponic-product-offers";
const CAMPAIGNS_KEY = "decor-aeroponic-email-campaigns";
let currentSalesRange = 7;

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

async function ensureAdminAccess() {
  try {
    await apiFetch("/api/admin/me", { method: "GET" });
    return true;
  } catch {
    window.location.href = "./all-products.html";
    return false;
  }
}

function readProfiles() {
  try {
    const raw = localStorage.getItem(USER_PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readObject(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function writeArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function collectImages(primaryInput, multilineInput, filesInput) {
  const list = [];
  const primary = String(primaryInput || "").trim();
  if (primary) list.push(primary);
  const multi = String(multilineInput || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  multi.forEach((u) => list.push(u));
  const files = filesInput instanceof FileList ? Array.from(filesInput) : [];
  for (const f of files) {
    if (!(f instanceof File) || f.size <= 0) continue;
    // eslint-disable-next-line no-await-in-loop
    const data = await readFileAsDataUrl(f);
    list.push(data);
  }
  const unique = [];
  const seen = new Set();
  list.forEach((x) => {
    if (!seen.has(x)) {
      seen.add(x);
      unique.push(x);
    }
  });
  return unique;
}

function formatRs(n) {
  return `Rs. ${Number(n || 0).toLocaleString("en-IN")}/-`;
}

function parsePriceToNumber(price) {
  const digits = String(price || "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function getBaseIds() {
  return new Set(Object.keys(window.BASE_PRODUCT_CATALOG || {}));
}

function getCatalog() {
  return window.PRODUCT_CATALOG || {};
}

function pickPrimary(images, idxInput) {
  const idx = Math.max(1, Math.floor(Number(idxInput) || 1));
  const i = Math.min(images.length, idx) - 1;
  return images[i] || images[0] || "./3D%20tower%20.png";
}

function syncInventoryMapWithCatalog() {
  const catalog = getCatalog();
  const inv = readObject(INVENTORY_KEY);
  let changed = false;
  Object.keys(catalog).forEach((id) => {
    if (!Object.prototype.hasOwnProperty.call(inv, id)) {
      inv[id] = 25;
      changed = true;
    }
  });
  if (changed) writeObject(INVENTORY_KEY, inv);
}

function renderProductsTable() {
  const body = document.getElementById("admin-products-body");
  if (!body) return;
  const catalog = getCatalog();
  const baseIds = getBaseIds();
  const inventory = readObject(INVENTORY_KEY);
  const offers = readObject(OFFERS_KEY);
  const adminProducts = readArray(ADMIN_PRODUCTS_KEY);
  const customIds = new Set(adminProducts.map((p) => p.id));

  body.innerHTML = "";
  Object.entries(catalog).forEach(([id, p]) => {
    const tr = document.createElement("tr");
    const stock = Number.isFinite(Number(inventory[id])) ? Math.max(0, Math.floor(Number(inventory[id]))) : 25;
    const offer = offers[id] && typeof offers[id] === "object" ? offers[id] : {};
    const offerLabel = String(offer.label || "").trim();
    const offerPct = Number.isFinite(Number(offer.pct)) ? Math.max(0, Math.floor(Number(offer.pct))) : 0;
    const offerActive = Boolean(offer.active && offerPct > 0);
    tr.innerHTML = `
      <td>${id}</td>
      <td>${p.name || "-"}</td>
      <td>${p.price || "-"}</td>
      <td>
        <span class="admin-inline">
          <input class="admin-stock-input" type="number" min="0" value="${stock}" data-stock-id="${id}" />
        </span>
      </td>
      <td>
        <span class="admin-inline">
          <input class="admin-offer-label" type="text" placeholder="Offer tag" value="${offerLabel}" data-offer-label-id="${id}" />
          <input class="admin-offer-pct" type="number" min="0" max="95" value="${offerPct}" data-offer-pct-id="${id}" />
          <label class="admin-inline"><input class="admin-offer-active" type="checkbox" ${offerActive ? "checked" : ""} data-offer-active-id="${id}" />On</label>
        </span>
      </td>
      <td>
        <span class="admin-inline">
          <button class="admin-btn" type="button" data-stock-save="${id}">Save</button>
          <button class="admin-edit-btn" type="button" data-edit-id="${id}">Edit</button>
          ${baseIds.has(id) || !customIds.has(id) ? "" : `<button class="admin-delete-btn" type="button" data-del-id="${id}">Delete</button>`}
        </span>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll("[data-stock-save]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-stock-save");
      const input = body.querySelector(`[data-stock-id="${id}"]`);
      const next = Math.max(0, Math.floor(Number(input?.value) || 0));
      const labelInput = body.querySelector(`[data-offer-label-id="${id}"]`);
      const pctInput = body.querySelector(`[data-offer-pct-id="${id}"]`);
      const activeInput = body.querySelector(`[data-offer-active-id="${id}"]`);
      const inv = readObject(INVENTORY_KEY);
      inv[id] = next;
      writeObject(INVENTORY_KEY, inv);
      const offersMap = readObject(OFFERS_KEY);
      const pct = Math.max(0, Math.min(95, Math.floor(Number(pctInput?.value) || 0)));
      const label = String(labelInput?.value || "").trim();
      const active = Boolean(activeInput?.checked) && pct > 0;
      if (active) {
        offersMap[id] = { label: label || `${pct}% OFF`, pct, active: true };
      } else {
        delete offersMap[id];
      }
      writeObject(OFFERS_KEY, offersMap);
      renderProductsTable();
    });
  });

  body.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-id");
      openEditModal(id);
    });
  });

  body.querySelectorAll("[data-del-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-id");
      const list = readArray(ADMIN_PRODUCTS_KEY).filter((p) => p.id !== id);
      writeArray(ADMIN_PRODUCTS_KEY, list);
      const inv = readObject(INVENTORY_KEY);
      delete inv[id];
      writeObject(INVENTORY_KEY, inv);
      const overrides = readObject(OVERRIDES_KEY);
      delete overrides[id];
      writeObject(OVERRIDES_KEY, overrides);
      const offersMap = readObject(OFFERS_KEY);
      delete offersMap[id];
      writeObject(OFFERS_KEY, offersMap);
      location.reload();
    });
  });
}

function renderSales() {
  const orders = readArray(ORDERS_KEY);
  const statOrders = document.getElementById("stat-orders");
  const statRevenue = document.getElementById("stat-revenue");
  const statItems = document.getElementById("stat-items");
  if (!statOrders || !statRevenue || !statItems) return;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalItems = orders.reduce(
    (sum, o) => sum + (Array.isArray(o.items) ? o.items.reduce((s, x) => s + Number(x.qty || 0), 0) : 0),
    0
  );
  statOrders.textContent = String(orders.length);
  statRevenue.textContent = formatRs(totalRevenue);
  statItems.textContent = String(totalItems);

  renderSalesChart(orders, currentSalesRange);
}

function renderSalesChart(orders, days) {
  const chart = document.getElementById("sales-chart");
  if (!chart) return;
  const now = new Date();
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({ key: d.toISOString().slice(0, 10), total: 0 });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  orders.forEach((o) => {
    if (!o || !o.createdAt) return;
    const key = String(o.createdAt).slice(0, 10);
    const b = map.get(key);
    if (b) b.total += Number(o.total || 0);
  });
  const max = Math.max(1, ...buckets.map((b) => b.total));
  chart.innerHTML = "";
  buckets.forEach((b) => {
    const bar = document.createElement("div");
    bar.className = "admin-chart__bar";
    bar.style.height = `${Math.max(6, (b.total / max) * 100)}%`;
    bar.title = `${b.key}: ${formatRs(b.total)}`;
    chart.appendChild(bar);
  });
}

function renderContacts() {
  const body = document.getElementById("admin-contacts-body");
  if (!body) return;
  const list = readArray(CONTACTS_KEY);
  body.innerHTML = "";
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="4">No user contacts recorded yet.</td></tr>`;
    return;
  }
  list.slice(0, 100).forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name || "-"}</td>
      <td>${c.method || "-"}</td>
      <td>${c.id || "-"}</td>
      <td>${c.at ? new Date(c.at).toLocaleString() : "-"}</td>
    `;
    body.appendChild(tr);
  });
}

async function renderUsers() {
  const body = document.getElementById("admin-users-body");
  if (!body) return;
  try {
    const data = await apiFetch("/api/admin/users", { method: "GET" });
    const users = Array.isArray(data?.users) ? data.users : [];
    body.innerHTML = "";
    if (!users.length) {
      body.innerHTML = `<tr><td colspan="4">No users found.</td></tr>`;
      return;
    }
    users.slice(0, 200).forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(u.location || "-")}</td>
        <td>${escapeHtml(u.name || "-")}</td>
        <td>${escapeHtml(u.phone || "-")}</td>
        <td>${escapeHtml(u.age ?? "-")}</td>
      `;
      body.appendChild(tr);
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4">Failed to load user profiles.</td></tr>`;
  }
}

async function renderInquiries() {
  const body = document.getElementById("admin-inquiries-body");
  if (!body) return;
  let list = [];
  try {
    const data = await apiFetch("/api/admin/inquiries", { method: "GET" });
    list = Array.isArray(data?.inquiries) ? data.inquiries : [];
  } catch {
    list = [];
  }
  body.innerHTML = "";
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8">No inquiries submitted yet.</td></tr>`;
    return;
  }
  list.slice().reverse().slice(0, 200).forEach((q) => {
      const email = String(q.email || "").trim();
      const name = String(q.name || "").trim() || "Customer";
      const subject = String(q.subject || "Inquiry").trim();
      const message = String(q.message || "").trim();
      const bodyText = `Hi ${name},

Thanks for contacting Decor Aeroponic regarding "${subject}".

${message}

Best regards,
Decor Aeroponic Team`;
      const mailtoHref = email
        ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${subject}`)}&body=${encodeURIComponent(bodyText)}`
        : "#";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(q.name || "-")}</td>
        <td>${escapeHtml(email || "-")}</td>
        <td>${escapeHtml(q.phone || "-")}</td>
        <td>${escapeHtml(subject || "-")}</td>
        <td>${escapeHtml(message || "-")}</td>
        <td>${q.createdAt ? new Date(q.createdAt).toLocaleString() : "-"}</td>
        <td>${escapeHtml(q.status || "New")}</td>
        <td>
          <span class="admin-inline">
            <a class="admin-reply-btn ${email ? "" : "is-disabled"}" href="${mailtoHref}" ${
              email ? "" : 'aria-disabled="true" tabindex="-1"'
            } target="_blank" rel="noopener noreferrer" data-inquiry-reply-id="${escapeHtml(q.id || "")}">Reply</a>
            <button type="button" class="admin-resolve-btn" data-inquiry-resolve-id="${escapeHtml(q.id || "")}">Resolve</button>
          </span>
        </td>
      `;
    body.appendChild(tr);
  });
}

function initInquiryActions() {
  const body = document.getElementById("admin-inquiries-body");
  if (!body) return;
  body.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const replyId = target.getAttribute("data-inquiry-reply-id");
    const resolveId = target.getAttribute("data-inquiry-resolve-id");
    if (!replyId && !resolveId) return;
    const targetId = String(replyId || resolveId || "");
    if (!targetId) return;
    const nextStatus = replyId ? "Replied" : "Resolved";
    apiFetch(`/api/admin/inquiries/${encodeURIComponent(targetId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    })
      .catch(() => {})
      .finally(() => renderInquiries());
  });
}

function setMsg(msgEl, text, isError = false) {
  if (!msgEl) return;
  msgEl.hidden = false;
  msgEl.textContent = text;
  msgEl.style.color = isError ? "#ffb7b7" : "";
}

async function initProductForm() {
  const form = document.getElementById("admin-product-form");
  const msg = document.getElementById("admin-product-msg");
  if (!form || !msg) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = String(fd.get("id") || "").trim().toLowerCase();
    const name = String(fd.get("name") || "").trim();
    const price = String(fd.get("price") || "").trim();
    const img = String(fd.get("img") || "").trim();
    const imgsRaw = String(fd.get("imgs") || "").trim();
    const primaryImageIndex = Number(fd.get("primaryImageIndex") || 1);
    const desc = String(fd.get("desc") || "").trim();
    const detailLong = String(fd.get("detailLong") || "").trim();
    const includedRaw = String(fd.get("included") || "").trim();
    const material = String(fd.get("material") || "").trim();
    const inventory = Math.max(0, Math.floor(Number(fd.get("inventory")) || 0));
    const imgFiles = form.elements.imgFiles?.files || null;
    if (!id || !name || !price) return setMsg(msg, "Please fill ID, name and price.", true);

    let images = [];
    try {
      images = await collectImages(img, imgsRaw, imgFiles);
    } catch {
      return setMsg(msg, "Image upload failed. Try another file.", true);
    }
    if (!images.length) images = ["./3D%20tower%20.png"];
    const imageValue = pickPrimary(images, primaryImageIndex);

    const included = includedRaw
      ? includedRaw
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
      : ["Product unit", "Quick start guide"];

    const list = readArray(ADMIN_PRODUCTS_KEY);
    const payload = {
      id,
      name,
      price,
      img: imageValue,
      imgs: images,
      desc,
      detailLong: detailLong || desc,
      included,
      material: material || "Custom product material details.",
      sampleReviews: [],
    };
    const idx = list.findIndex((x) => x.id === id);
    if (idx >= 0) list[idx] = payload;
    else list.push(payload);
    writeArray(ADMIN_PRODUCTS_KEY, list);

    const inv = readObject(INVENTORY_KEY);
    inv[id] = inventory;
    writeObject(INVENTORY_KEY, inv);

    setMsg(msg, "Product saved. Refreshing dashboard...");
    form.reset();
    setTimeout(() => location.reload(), 450);
  });
}

function openEditModal(id) {
  const modal = document.getElementById("admin-edit-modal");
  const form = document.getElementById("admin-edit-form");
  const catalog = getCatalog();
  const p = catalog[id];
  const inventory = readObject(INVENTORY_KEY);
  if (!modal || !form || !p) return;
  form.elements.id.value = id;
  form.elements.inventory.value = Number.isFinite(Number(inventory[id])) ? Math.max(0, Math.floor(Number(inventory[id]))) : 25;
  form.elements.name.value = p.name || "";
  form.elements.price.value = p.price || "";
  form.elements.img.value = p.img || "";
  form.elements.imgs.value = Array.isArray(p.imgs) ? p.imgs.join("\n") : p.img ? p.img : "";
  const imgsCount = Array.isArray(p.imgs) && p.imgs.length ? p.imgs.length : p.img ? 1 : 1;
  const activeIdx =
    Array.isArray(p.imgs) && p.img
      ? Math.max(1, p.imgs.findIndex((x) => x === p.img) + 1)
      : 1;
  form.elements.primaryImageIndex.value = Math.min(activeIdx, imgsCount);
  form.elements.desc.value = p.desc || "";
  form.elements.detailLong.value = p.detailLong || "";
  form.elements.included.value = Array.isArray(p.included) ? p.included.join("\n") : "";
  form.elements.material.value = p.material || "";
  if (typeof modal.showModal === "function") modal.showModal();
}

function initEditModal() {
  const modal = document.getElementById("admin-edit-modal");
  const form = document.getElementById("admin-edit-form");
  const cancel = document.getElementById("admin-edit-cancel");
  if (!modal || !form || !cancel) return;

  cancel.addEventListener("click", () => modal.close());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = String(fd.get("id") || "").trim();
    if (!id) return;
    const name = String(fd.get("name") || "").trim();
    const price = String(fd.get("price") || "").trim();
    const img = String(fd.get("img") || "").trim();
    const imgsRaw = String(fd.get("imgs") || "").trim();
    const primaryImageIndex = Number(fd.get("primaryImageIndex") || 1);
    const desc = String(fd.get("desc") || "").trim();
    const detailLong = String(fd.get("detailLong") || "").trim();
    const includedRaw = String(fd.get("included") || "").trim();
    const material = String(fd.get("material") || "").trim();
    const inv = Math.max(0, Math.floor(Number(fd.get("inventory")) || 0));
    const imgFiles = form.elements.imgFiles?.files || null;
    if (!name || !price) return;

    let images = [];
    try {
      images = await collectImages(img, imgsRaw, imgFiles);
    } catch {
      return;
    }
    if (!images.length) images = ["./3D%20tower%20.png"];
    const imageValue = pickPrimary(images, primaryImageIndex);

    const included = includedRaw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const adminProducts = readArray(ADMIN_PRODUCTS_KEY);
    const idx = adminProducts.findIndex((p) => p.id === id);
    if (idx >= 0) {
      adminProducts[idx] = {
        ...adminProducts[idx],
        name,
        price,
        img: imageValue,
        imgs: images,
        desc,
        detailLong: detailLong || desc || adminProducts[idx].detailLong,
        included: included.length ? included : adminProducts[idx].included,
        material: material || adminProducts[idx].material,
      };
      writeArray(ADMIN_PRODUCTS_KEY, adminProducts);
    } else {
      const overrides = readObject(OVERRIDES_KEY);
      overrides[id] = {
        name,
        price,
        img: imageValue,
        imgs: images,
        desc,
        detailLong: detailLong || desc,
        included,
        material,
      };
      writeObject(OVERRIDES_KEY, overrides);
    }
    const inventoryMap = readObject(INVENTORY_KEY);
    inventoryMap[id] = inv;
    writeObject(INVENTORY_KEY, inventoryMap);
    modal.close();
    location.reload();
  });
}

function toCsv(rows) {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? "");
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function initCsvExports() {
  const salesBtn = document.getElementById("export-sales-csv");
  const contactsBtn = document.getElementById("export-contacts-csv");
  if (salesBtn) {
    salesBtn.addEventListener("click", () => {
      const orders = readArray(ORDERS_KEY);
      const rows = [["Order ID", "Created At", "Customer Name", "Email", "Phone", "Total"]];
      orders.forEach((o) => {
        rows.push([
          o.id || "",
          o.createdAt || "",
          o.customer?.name || "",
          o.customer?.email || "",
          o.customer?.phone || "",
          Number(o.total || 0),
        ]);
      });
      downloadCsv("sales-report.csv", rows);
    });
  }
  if (contactsBtn) {
    contactsBtn.addEventListener("click", () => {
      const contacts = readArray(CONTACTS_KEY);
      const rows = [["Name", "Method", "Identity", "Recorded At"]];
      contacts.forEach((c) => rows.push([c.name || "", c.method || "", c.id || "", c.at || ""]));
      downloadCsv("user-contacts.csv", rows);
    });
  }
}

function initContactsModal() {
  const openBtn = document.getElementById("view-contacts-btn");
  const closeBtn = document.getElementById("close-contacts-btn");
  const modal = document.getElementById("admin-contacts-modal");
  if (!openBtn || !closeBtn || !modal) return;
  openBtn.addEventListener("click", () => {
    renderContacts();
    if (typeof modal.showModal === "function") modal.showModal();
  });
  closeBtn.addEventListener("click", () => modal.close());
}

function initSalesRangeButtons() {
  const btns = Array.from(document.querySelectorAll("[data-sales-range]"));
  if (!btns.length) return;
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      btns.forEach((x) => x.classList.toggle("is-active", x === b));
      currentSalesRange = Number(b.getAttribute("data-sales-range")) || 7;
      renderSales();
    });
  });
}

async function renderCampaignHistory() {
  const body = document.getElementById("campaign-history-body");
  if (!body) return;
  let campaigns = [];
  try {
    const data = await apiFetch("/api/admin/email-campaigns", { method: "GET" });
    campaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
  } catch {
    campaigns = [];
  }
  body.innerHTML = "";
  if (!campaigns.length) {
    body.innerHTML = `<tr><td colspan="4">No campaigns sent yet.</td></tr>`;
    return;
  }
  campaigns
    .slice()
    .reverse()
    .slice(0, 25)
    .forEach((c) => {
      const tr = document.createElement("tr");
      const at = c.at || c.createdAt || "";
      tr.innerHTML = `
        <td>${at ? new Date(at).toLocaleString() : "-"}</td>
        <td>${c.subject || "-"}</td>
        <td>${Number(c.totalUsers || 0)}</td>
        <td>${Number(c.emailUsers || 0)}</td>
      `;
      body.appendChild(tr);
    });
}

function initEmailMarketing() {
  const form = document.getElementById("email-campaign-form");
  const msg = document.getElementById("email-campaign-msg");
  if (!form || !msg) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const subject = String(fd.get("subject") || "").trim();
    const body = String(fd.get("body") || "").trim();
    if (!subject || !body) return;

    apiFetch("/api/admin/email-campaigns", {
      method: "POST",
      body: JSON.stringify({ subject, body }),
    })
      .then((data) => {
        const c = data?.campaign;
        msg.hidden = false;
        msg.textContent = `Campaign queued for ${c?.totalUsers || 0} users (${c?.emailUsers || 0} email contacts).`;
        form.reset();
        renderCampaignHistory();
      })
      .catch((err) => {
        msg.hidden = false;
        msg.textContent = err?.message || "Failed to queue email campaign.";
      });
  });
}

async function renderPhoneCampaignHistory() {
  const body = document.getElementById("phone-campaign-history-body");
  if (!body) return;
  let campaigns = [];
  try {
    const data = await apiFetch("/api/admin/phone-campaigns", { method: "GET" });
    campaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
  } catch {
    campaigns = [];
  }
  body.innerHTML = "";
  if (!campaigns.length) {
    body.innerHTML = `<tr><td colspan="4">No phone campaigns sent yet.</td></tr>`;
    return;
  }
  campaigns
    .slice()
    .reverse()
    .slice(0, 25)
    .forEach((c) => {
      const tr = document.createElement("tr");
      const at = c.at || c.createdAt || "";
      tr.innerHTML = `
        <td>${at ? new Date(at).toLocaleString() : "-"}</td>
        <td>${escapeHtml(c.message || "-")}</td>
        <td>${Number(c.totalUsers || 0)}</td>
        <td>${Number(c.phoneUsers || 0)}</td>
      `;
      body.appendChild(tr);
    });
}

function initPhoneMarketing() {
  const form = document.getElementById("phone-campaign-form");
  const msg = document.getElementById("phone-campaign-msg");
  if (!form || !msg) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const message = String(fd.get("message") || "").trim();
    if (!message) return;

    apiFetch("/api/admin/phone-campaigns", {
      method: "POST",
      body: JSON.stringify({ message }),
    })
      .then((data) => {
        const c = data?.campaign;
        msg.hidden = false;
        msg.textContent = `Phone campaign queued for ${c?.totalUsers || 0} users (${c?.phoneUsers || 0} phone numbers).`;
        form.reset();
        renderPhoneCampaignHistory();
      })
      .catch((err) => {
        msg.hidden = false;
        msg.textContent = err?.message || "Failed to queue phone campaign.";
      });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await ensureAdminAccess();
  if (!isAdmin) return;
  syncInventoryMapWithCatalog();
  initProductForm();
  initEditModal();
  initCsvExports();
  initContactsModal();
  initInquiryActions();
  initSalesRangeButtons();
  initPhoneMarketing();
  initEmailMarketing();
  renderProductsTable();
  renderSales();
  renderCampaignHistory();
  renderPhoneCampaignHistory();
  renderInquiries();
  renderUsers();
});
