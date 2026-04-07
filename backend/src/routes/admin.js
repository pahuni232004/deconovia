const express = require("express");
const prisma = require("../lib/prisma");
const { requireSession, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireSession);
router.use(requireAdmin);

router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        age: true,
        location: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return res.json({ users });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.users]", err?.message || err);
    return res.status(500).json({ error: "Failed to load users" });
  }
});

router.get("/me", async (req, res) => {
  try {
    if (!req.session?.adminId) return res.status(403).json({ error: "Not admin session" });
    const admin = await prisma.adminUser.findUnique({ where: { id: req.session.adminId } });
    return res.json({ admin });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.me]", err?.message || err);
    return res.status(500).json({ error: "Failed to load admin" });
  }
});

router.get("/inquiries", async (req, res) => {
  try {
    const list = await prisma.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return res.json({ inquiries: list });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.inquiries]", err?.message || err);
    return res.status(500).json({ error: "Failed to load inquiries" });
  }
});

router.patch("/inquiries/:id/status", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const { status } = req.body || {};
    const nextStatus = String(status || "").trim();
    if (!id || !nextStatus) return res.status(400).json({ error: "id and status required" });

    if (!["New", "Replied", "Resolved"].includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const data = nextStatus === "Resolved" ? { status: nextStatus } : { status: nextStatus, repliedAt: new Date() };
    const updated = await prisma.contactInquiry.update({
      where: { id },
      data,
    });
    return res.json({ ok: true, inquiry: updated });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.inquiries.status]", err?.message || err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

async function sendEmail(to, subject, text) {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!sendgridKey) return { skipped: true };
  // Lazy require so missing deps don't crash.
  // eslint-disable-next-line global-require
  const sendgrid = require("@sendgrid/mail");
  sendgrid.setApiKey(sendgridKey);
  const from = process.env.SENDGRID_FROM_EMAIL || "hello@decoraeroponic.com";
  await sendgrid.send({ to, from, subject, text });
  return { skipped: false };
}

async function sendSms(to, text) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { skipped: true };
  // eslint-disable-next-line global-require
  const twilio = require("twilio");
  const client = twilio(sid, token);
  await client.messages.create({ to, from, body: text });
  return { skipped: false };
}

router.post("/email-campaigns", async (req, res) => {
  try {
    const { subject, body } = req.body || {};
    const subj = String(subject || "").trim();
    const msg = String(body || "").trim();
    if (!subj || !msg) return res.status(400).json({ error: "subject and body required" });

    const users = await prisma.user.findMany({ select: { email: true }, where: { email: { not: null } } });
    const emails = users.map((u) => u.email).filter(Boolean);
    const uniqueEmails = Array.from(new Set(emails));

    // Fire-and-forget sending; campaign history is still stored.
    for (const email of uniqueEmails.slice(0, 500)) {
      // eslint-disable-next-line no-await-in-loop
      await sendEmail(email, subj, msg).catch(() => {});
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        subject: subj,
        body: msg,
        totalUsers: uniqueEmails.length,
        emailUsers: uniqueEmails.length,
      },
    });
    return res.json({ ok: true, campaign });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.email-campaigns]", err?.message || err);
    return res.status(500).json({ error: "Failed to create email campaign" });
  }
});

router.post("/phone-campaigns", async (req, res) => {
  try {
    const { message } = req.body || {};
    const msg = String(message || "").trim();
    if (!msg) return res.status(400).json({ error: "message required" });

    const users = await prisma.user.findMany({ select: { phone: true } });
    const phones = users.map((u) => u.phone).filter(Boolean);
    const uniquePhones = Array.from(new Set(phones));

    for (const phone of uniquePhones.slice(0, 500)) {
      // eslint-disable-next-line no-await-in-loop
      await sendSms(phone, msg).catch(() => {});
    }

    const campaign = await prisma.phoneCampaign.create({
      data: {
        message: msg,
        totalUsers: uniquePhones.length,
        phoneUsers: uniquePhones.length,
      },
    });

    return res.json({ ok: true, campaign });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.phone-campaigns]", err?.message || err);
    return res.status(500).json({ error: "Failed to create phone campaign" });
  }
});

router.get("/email-campaigns", async (req, res) => {
  try {
    const history = await prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return res.json({ campaigns: history });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.email-campaigns.list]", err?.message || err);
    return res.status(500).json({ error: "Failed to load email campaigns" });
  }
});

router.get("/phone-campaigns", async (req, res) => {
  try {
    const history = await prisma.phoneCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return res.json({ campaigns: history });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.phone-campaigns.list]", err?.message || err);
    return res.status(500).json({ error: "Failed to load phone campaigns" });
  }
});

// One-time migration helper for legacy localStorage-based demo data.
// This endpoint is admin-only; it can import inquiries and campaign history sent from the browser.
router.post("/import-localstorage", async (req, res) => {
  try {
    const payload = req.body || {};

    const inquiries = Array.isArray(payload.inquiries) ? payload.inquiries : [];
    const emailCampaigns = Array.isArray(payload.emailCampaigns) ? payload.emailCampaigns : [];
    const phoneCampaigns = Array.isArray(payload.phoneCampaigns) ? payload.phoneCampaigns : [];

    const inquiryData = inquiries
      .map((q) => {
        const name = String(q?.name || "").trim();
        const subject = String(q?.subject || "").trim();
        const message = String(q?.message || "").trim();
        if (!name || !subject || !message) return null;
        return {
          name,
          email: q?.email ? String(q.email).trim().toLowerCase() : null,
          phone: q?.phone ? String(q.phone).trim() : null,
          subject,
          message,
          status: String(q?.status || "New").trim() || "New",
          repliedAt: q?.repliedAt ? new Date(q.repliedAt) : null,
          createdAt: q?.createdAt ? new Date(q.createdAt) : undefined,
        };
      })
      .filter(Boolean);

    const emailData = emailCampaigns
      .map((c) => {
        const subject = String(c?.subject || "").trim();
        const body = String(c?.body || "").trim();
        if (!subject || !body) return null;
        return {
          subject,
          body,
          totalUsers: Number(c?.totalUsers || 0),
          emailUsers: Number(c?.emailUsers || 0),
          createdAt: c?.at ? new Date(c.at) : c?.createdAt ? new Date(c.createdAt) : undefined,
        };
      })
      .filter(Boolean);

    const phoneData = phoneCampaigns
      .map((c) => {
        const message = String(c?.message || c?.body || "").trim();
        if (!message) return null;
        return {
          message,
          totalUsers: Number(c?.totalUsers || 0),
          phoneUsers: Number(c?.phoneUsers || 0),
          createdAt: c?.at ? new Date(c.at) : c?.createdAt ? new Date(c.createdAt) : undefined,
        };
      })
      .filter(Boolean);

    if (inquiryData.length) await prisma.contactInquiry.createMany({ data: inquiryData });
    if (emailData.length) await prisma.emailCampaign.createMany({ data: emailData });
    if (phoneData.length) await prisma.phoneCampaign.createMany({ data: phoneData });

    return res.json({
      ok: true,
      imported: {
        inquiries: inquiryData.length,
        emailCampaigns: emailData.length,
        phoneCampaigns: phoneData.length,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin.import-localstorage]", err?.message || err);
    return res.status(500).json({ error: "Import failed" });
  }
});

module.exports = router;

