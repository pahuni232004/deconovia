const prisma = require("../lib/prisma");
const { getCookieName } = require("../lib/session");

async function requireSession(req, res, next) {
  const cookieName = getCookieName();
  const sessionId = req.cookies?.[cookieName];
  if (!sessionId) return res.status(401).json({ error: "Not authenticated" });

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) return res.status(401).json({ error: "Invalid session" });
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return res.status(401).json({ error: "Session expired" });
  }

  req.session = session;
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.adminId) return res.status(403).json({ error: "Admin only" });
  return next();
}

function requireUser(req, res, next) {
  if (!req.session?.userId) return res.status(403).json({ error: "User only" });
  return next();
}

module.exports = { requireSession, requireAdmin, requireUser };

