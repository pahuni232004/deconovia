const AUTH_STORAGE_KEY = "decor-aeroponic-auth-user";
const AUTH_CONTACTS_KEY = "decor-aeroponic-user-contacts";
const USER_PROFILES_KEY = "decor-aeroponic-user-profiles";
const OTP_CACHE = new Map();

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

  // Common local setup: frontend on :5500 and backend on :3001.
  // If same-origin API returns 501/404 or network fails, retry once on localhost backend.
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

  if (!res) {
    throw new Error("Backend unavailable. Start backend API on http://localhost:3001.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setSessionUser(user) {
  window.AUTH_SESSION_USER = user || null;
  window.AUTH_SESSION_ADMIN = null;
}

function setSessionAdmin(admin) {
  window.AUTH_SESSION_ADMIN = admin || null;
  window.AUTH_SESSION_USER = null;
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuthUser(user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  try {
    const nowIso = new Date().toISOString();

    // --- Upsert full user profile DB (for admin marketing) ---
    const email = user?.email ? String(user.email).trim().toLowerCase() : "";
    const phone = user?.phone ? String(user.phone).replace(/[^\d+]/g, "").trim() : "";
    if (email && phone) {
      const rawProfiles = localStorage.getItem(USER_PROFILES_KEY);
      const profiles = rawProfiles ? JSON.parse(rawProfiles) : [];
      const arr = Array.isArray(profiles) ? profiles : [];

      const idx = arr.findIndex((p) => p && String(p.email || "").toLowerCase() === email);
      const nextProfile = {
        id: email,
        name: user.name || arr[idx]?.name || "",
        email,
        phone,
        at: arr[idx]?.at || nowIso,
        lastLoginAt: nowIso,
        updatedAt: nowIso,
        method: user.method || arr[idx]?.method || "",
      };
      if (idx >= 0) arr[idx] = { ...arr[idx], ...nextProfile };
      else arr.unshift(nextProfile);
      localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(arr.slice(0, 2000)));
    }

    // --- Upsert legacy contacts list (still used by some admin UI) ---
    const raw = localStorage.getItem(AUTH_CONTACTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;

    const upsertContact = (entry) => {
      const exists = list.some((x) => x && x.method === entry.method && x.id === entry.id);
      if (!exists) {
        list.unshift(entry);
      }
    };

    // If we have full profile info, store both email + phone in contacts.
    if (email && phone) {
      upsertContact({ name: user.name || "", method: "gmail", id: email, at: nowIso });
      upsertContact({ name: user.name || "", method: "phone", id: phone, at: nowIso });
    } else {
      const entry = {
        name: user.name || "",
        method: user.method || "",
        id: user.id || "",
        at: nowIso,
      };
      if (entry.method && entry.id) upsertContact(entry);
    }

    localStorage.setItem(AUTH_CONTACTS_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

function clearAuthUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function userInitial(user) {
  const txt = String(user?.name || user?.id || "A").trim();
  return txt ? txt.charAt(0).toUpperCase() : "A";
}

function initMobileNavToggle() {
  const path = window.location.pathname;
  const isHomePage = path.endsWith("/index.html") || path.endsWith("/") || path === "";
  if (isHomePage) return;

  const navToggle = document.querySelector(".nav-toggle");
  const topNav = document.querySelector(".top-nav");
  if (!navToggle || !topNav) return;

  const mobileBreakpoint = 980;
  navToggle.addEventListener("click", () => {
    const isOpen = topNav.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > mobileBreakpoint && topNav.classList.contains("menu-open")) {
      topNav.classList.remove("menu-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

async function updateAccountNav() {
  try {
    // Try user session first
    const me = await apiFetch("/api/auth/me", { method: "GET" });
    setSessionUser(me.user || null);
  } catch {
    try {
      const adm = await apiFetch("/api/admin/me", { method: "GET" });
      setSessionAdmin(adm.admin || null);
    } catch {
      setSessionUser(null);
      setSessionAdmin(null);
    }
  }

  const user = window.AUTH_SESSION_USER;
  const admin = window.AUTH_SESSION_ADMIN;
  const isAdmin = Boolean(admin);

  document.querySelectorAll("[data-account-link]").forEach((link) => {
    const nameEl = link.querySelector("[data-account-name]");
    const avatarEl = link.querySelector("[data-account-avatar]");
    if (nameEl) nameEl.textContent = user ? user.name : isAdmin ? "Admin" : "Account";
    if (avatarEl) avatarEl.textContent = isAdmin ? "AD" : userInitial(user);
    link.classList.toggle("is-admin", isAdmin);
    link.setAttribute("aria-label", isAdmin ? "Admin account" : "Account");
    link.href = "./account.html";
  });
}

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
}

function hideAuthError() {
  const el = document.getElementById("auth-error");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function parseIdentity(identityRaw) {
  const txt = String(identityRaw || "").trim();
  const email = txt.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { method: "gmail", id: email };
  const phone = txt.replace(/[^\d+]/g, "");
  if (/^\+?\d{10,14}$/.test(phone)) return { method: "phone", id: phone };
  return null;
}

function renderAccountPage() {
  const forms = document.getElementById("auth-forms");
  const panel = document.getElementById("account-panel");
  if (!forms || !panel) return;

  const user = window.AUTH_SESSION_USER;
  if (!user) {
    forms.hidden = false;
    panel.hidden = true;
    return;
  }

  forms.hidden = true;
  panel.hidden = false;
  const nameEl = document.getElementById("account-name");
  const methodEl = document.getElementById("account-method");
  const idEl = document.getElementById("account-id");
  if (nameEl) nameEl.textContent = user.name || "-";
  if (methodEl) {
    const method = user.email ? "Email" : user.phone ? "Phone" : "User";
    methodEl.textContent = method;
  }
  if (idEl) idEl.textContent = user.email || user.phone || "-";
}

function initAuthTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-auth-panel]"));
  const panels = Array.from(document.querySelectorAll("[data-auth-panel-content]"));
  if (!tabs.length || !panels.length) return;

  const titleEl = document.querySelector("[data-auth-title]");
  const subtitleEl = document.querySelector("[data-auth-subtitle]");
  const headingsByMode = {
    signin: { title: "Welcome Back", subtitle: "Sign in with your email or phone number." },
    signup: { title: "Hello", subtitle: "Sign up with your name, number, and email." },
    admin: { title: "", subtitle: "" },
  };

  function setModeHeading(mode) {
    const next = headingsByMode[mode] || headingsByMode.signin;
    if (titleEl) {
      titleEl.textContent = next.title;
      titleEl.hidden = !next.title;
    }
    if (subtitleEl) {
      subtitleEl.textContent = next.subtitle;
      subtitleEl.hidden = !next.subtitle;
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.authPanel;
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      panels.forEach((p) => {
        p.classList.toggle("is-hidden", p.dataset.authPanelContent !== mode);
      });
      setModeHeading(mode);
      hideAuthError();
    });
  });

  const active = tabs.find((t) => t.classList.contains("is-active"));
  setModeHeading(active?.dataset.authPanel || "signin");
}

function initAuthForms() {
  const signinForm = document.getElementById("signin-form");
  const signupForm = document.getElementById("signup-form");
  const adminLoginForm = document.getElementById("admin-login-form");
  const sendOtpBtn = document.getElementById("send-otp-btn");
  if (!signinForm || !signupForm || !adminLoginForm || !sendOtpBtn) return;

  sendOtpBtn.addEventListener("click", () => {
    hideAuthError();
    const identityRaw = String(new FormData(signinForm).get("identity") || "");
    const parsed = parseIdentity(identityRaw);
    if (!parsed) return showAuthError("Enter valid Gmail or phone before OTP.");
    apiFetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ identity: parsed.id }),
    })
      .then((data) => {
        const demo = data?.demoOtp ? ` Demo OTP: ${data.demoOtp}` : "";
        showAuthError(`OTP sent to ${parsed.id}.${demo}`);
      })
      .catch((err) => showAuthError(err?.message || "Failed to send OTP"));
  });

  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError();
    const fd = new FormData(signinForm);
    const identityRaw = String(fd.get("identity") || "");
    const otp = String(fd.get("otp") || "").trim();
    const parsed = parseIdentity(identityRaw);
    if (!parsed) return showAuthError("Enter a valid Gmail or phone.");
    if (!otp || otp.length !== 6) return showAuthError("Enter the 6-digit OTP.");

    try {
      const data = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ identity: parsed.id, otp }),
      });
      if (data?.user) setSessionUser(data.user);
      await updateAccountNav();
      renderAccountPage();
    } catch (err) {
      showAuthError(err?.message || "Incorrect OTP. Please resend OTP.");
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError();
    const fd = new FormData(signupForm);
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").replace(/[^\d+]/g, "");
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const age = String(fd.get("age") || "").trim();

    if (!name) return showAuthError("Please enter your name.");
    if (!/^\+?\d{10,14}$/.test(phone)) return showAuthError("Enter a valid phone number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError("Enter a valid email.");
    if (!age || !Number.isFinite(Number(age))) return showAuthError("Enter your age.");

    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, age: Number(age) }),
      });
      showAuthError("Account created. Please sign in with OTP.");
      // Switch to Sign in tab.
      const signinTab = document.querySelector('[data-auth-panel="signin"]');
      signinTab?.click();
    } catch (err) {
      showAuthError(err?.message || "Failed to create account.");
    }
  });

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError();
    const fd = new FormData(adminLoginForm);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");

    try {
      await apiFetch("/api/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      // Admin session is server-side; reflect it in UI.
      await updateAccountNav();
      window.location.href = "./admin.html";
    } catch (err) {
      // Fallback path when API isn't available (e.g. static preview returning 501).
      if (Number(err?.status) === 501) {
        const isAllowedAdmin =
          (username === "Pahuni" || username === "Pavit") &&
          password === "wewillsucceed";
        if (isAllowedAdmin) {
          showAuthError(
            "Backend unavailable (501). Proceeding with local admin fallback."
          );
          setSessionAdmin({ username });
          await updateAccountNav();
          window.location.href = "./admin.html";
          return;
        }
      }
      showAuthError(err?.message || "Invalid admin credentials.");
    }
  });
}

function initLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    apiFetch("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        setSessionUser(null);
        setSessionAdmin(null);
        updateAccountNav().finally(() => renderAccountPage());
      });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileNavToggle();
  initAuthTabs();
  initAuthForms();
  initLogout();
  updateAccountNav().finally(() => renderAccountPage());
});
