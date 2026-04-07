const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.post("/inquiries", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    const n = String(name || "").trim();
    const e = String(email || "").trim().toLowerCase();
    const p = String(phone || "").trim().replace(/[^\d+]/g, "");
    const subj = String(subject || "").trim();
    const msg = String(message || "").trim();

    if (!n || !e || !p || !subj || !msg) {
      return res.status(400).json({ error: "name, email, phone, subject, message are required" });
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: n,
        email: e,
        phone: p,
        subject: subj,
        message: msg,
        status: "New",
      },
    });

    return res.status(201).json({ ok: true, inquiry });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[contact.inquiries]", err?.message || err);
    return res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

module.exports = router;

