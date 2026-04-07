const express = require("express");
const prisma = require("../lib/prisma");
const { hashPassword, verifyPassword } = require("../lib/password");
const { generateOtp, hashOtp, verifyOtp } = require("../lib/otp");
const { createSessionCookie, clearSessionCookie } = require("../lib/session");
const { requireSession } = require("../middleware/auth");

const router = express.Router();

async function ensureAdminSeed() {
  const count = await prisma.adminUser.count();
  if (count > 0) return;

  const u1 = process.env.ADMIN_SEED_USERNAME_1;
  const p1 = process.env.ADMIN_SEED_PASSWORD_1;
  const u2 = process.env.ADMIN_SEED_USERNAME_2;
  const p2 = process.env.ADMIN_SEED_PASSWORD_2;

  const entries = [
    u1 && p1 ? { username: u1, password: p1 } : null,
    u2 && p2 ? { username: u2, password: p2 } : null,
  ].filter(Boolean);

  if (!entries.length) return;

  for (const e of entries) {
    // eslint-disable-next-line no-await-in-loop
    const passwordHash = await hashPassword(e.password);
    // eslint-disable-next-line no-await-in-loop
    await prisma.adminUser.create({ data: { username: e.username, passwordHash } });
  }
}

function normalizeIdentity(identityRaw) {
  const txt = String(identityRaw || "").trim();
  if (!txt) return "";
  return txt.toLowerCase();
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, age, location } = req.body || {};
    const n = String(name || "").trim();
    const e = String(email || "").trim().toLowerCase();
    const p = String(phone || "").trim().replace(/[^\d+]/g, "");
    const a = Number(age);
    const loc = String(location || "N/A").trim() || "N/A";

    if (!n || !e || !p || !Number.isFinite(a)) {
      return res.status(400).json({ error: "name, email, phone, age are required" });
    }
    if (!e.includes("@")) return res.status(400).json({ error: "Valid email required" });
    if (String(p).length < 10) return res.status(400).json({ error: "Valid phone required" });

    await prisma.user.create({
      data: {
        name: n,
        email: e,
        phone: p,
        age: Math.floor(a),
        location: loc,
      },
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth.signup]", err?.message || err);
    return res.status(409).json({ error: "User already exists or invalid data" });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { identity } = req.body || {};
    const id = normalizeIdentity(identity);
    if (!id) return res.status(400).json({ error: "identity is required" });

    // Generate + store OTP
    const otp = generateOtp();
    const otpStored = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({
      data: {
        identity: id,
        otpHash: otpStored,
        expiresAt,
      },
    });

    // Send (Twilio SMS / SendGrid email)
    const isEmail = id.includes("@");
    const allowDemo = process.env.ALLOW_DEMO_OTP === "true";
    let demoOtp = null;

    if (isEmail) {
      const sendgridKey = process.env.SENDGRID_API_KEY;
      if (sendgridKey) {
        const sendgrid = require("@sendgrid/mail");
        sendgrid.setApiKey(sendgridKey);
        await sendgrid.send({
          to: id,
          from: process.env.SENDGRID_FROM_EMAIL || "hello@decoraeroponic.com",
          subject: "Your Decor Aeroponic OTP",
          text: `Your OTP is: ${otp}. (Demo OTP)`,
        });
      } else {
        // In case you don't configure providers yet, we still keep the OTP server-side.
        // eslint-disable-next-line no-console
        console.log(`[DEV OTP email to ${id}] ${otp}`);
        if (allowDemo) demoOtp = otp;
      }
    } else {
      const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
        const twilio = require("twilio");
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `Your OTP is: ${otp}.`,
          from: TWILIO_FROM_NUMBER,
          to: id,
        });
      } else {
        // eslint-disable-next-line no-console
        console.log(`[DEV OTP sms to ${id}] ${otp}`);
        if (allowDemo) demoOtp = otp;
      }
    }

    return res.json({ ok: true, demoOtp });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth.send-otp]", err?.message || err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { identity, otp } = req.body || {};
    const id = normalizeIdentity(identity);
    const otpTxt = String(otp || "").trim();
    if (!id || !otpTxt) return res.status(400).json({ error: "identity and otp are required" });

    const now = new Date();
    const record = await prisma.otpCode.findFirst({
      where: {
        identity: id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(400).json({ error: "OTP expired or invalid" });

    const ok = verifyOtp(otpTxt, record.otpHash);
    if (!ok) return res.status(400).json({ error: "Incorrect OTP" });

    // Find matching user
    const isEmail = id.includes("@");
    const user = isEmail ? await prisma.user.findUnique({ where: { email: id } }) : await prisma.user.findUnique({ where: { phone: id } });
    if (!user) return res.status(400).json({ error: "No user found for identity" });

    // Create session
    const sessionId = await prisma.session.create({
      data: {
        userId: user.id,
        adminId: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    createSessionCookie(res, sessionId.id, sessionId.expiresAt);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        location: user.location,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth.verify-otp]", err?.message || err);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
});

router.post("/admin-login", async (req, res) => {
  try {
    await ensureAdminSeed();
    const { username, password } = req.body || {};
    const u = String(username || "").trim();
    const p = String(password || "");
    if (!u || !p) return res.status(400).json({ error: "username and password required" });

    const admin = await prisma.adminUser.findUnique({ where: { username: u } });
    if (!admin) return res.status(401).json({ error: "Invalid admin credentials" });

    const ok = await verifyPassword(p, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid admin credentials" });

    const session = await prisma.session.create({
      data: {
        adminId: admin.id,
        userId: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    createSessionCookie(res, session.id, session.expiresAt);
    return res.json({ ok: true, admin: { username: admin.username } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth.admin-login]", err?.message || err);
    return res.status(500).json({ error: "Admin login failed" });
  }
});

router.get("/me", requireSession, async (req, res) => {
  try {
    if (req.session?.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
      return res.json({ user });
    }
    return res.status(403).json({ error: "Not a user session" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth.me]", err?.message || err);
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

router.post("/logout", requireSession, async (req, res) => {
  // Clear cookie and optionally delete session.
  try {
    if (req.session?.id) {
      await prisma.session.delete({ where: { id: req.session.id } }).catch(() => {});
    }
  } catch {
    // ignore
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

module.exports = router;

