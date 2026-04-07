const DEFAULT_COOKIE_NAME = "decor_session";

function getCookieName() {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function createSessionCookie(res, sessionId, expiresAt) {
  const cookieName = getCookieName();
  const maxAgeMs = Math.max(0, new Date(expiresAt).getTime() - Date.now());

  res.cookie(cookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeMs,
    path: "/",
  });
}

function clearSessionCookie(res) {
  const cookieName = getCookieName();
  res.clearCookie(cookieName, { path: "/" });
}

module.exports = { createSessionCookie, clearSessionCookie, getCookieName };

