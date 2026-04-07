const express = require("express");
const prisma = require("../lib/prisma");
const { getCookieName, createSessionCookie } = require("../lib/session");

const router = express.Router();

async function getOrCreateSession(req, res) {
  const cookieName = getCookieName();
  const sessionId = req.cookies?.[cookieName];
  if (sessionId) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (session && new Date(session.expiresAt).getTime() > Date.now()) return session;
  }
  const session = await prisma.session.create({
    data: {
      userId: null,
      adminId: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  createSessionCookie(res, session.id, session.expiresAt);
  await prisma.cart.upsert({
    where: { sessionId: session.id },
    update: {},
    create: { sessionId: session.id },
  });
  return session;
}

router.post("/", async (req, res) => {
  try {
    const session = await getOrCreateSession(req, res);
    const cart = await prisma.cart.findUnique({
      where: { sessionId: session.id },
      include: { items: { include: { product: { include: { inventory: true, offer: true } } } } },
    });
    const items = cart?.items || [];
    if (!items.length) return res.status(409).json({ error: "Cart is empty" });

    // Stock validation & totals
    let totalCents = 0;
    const snapshots = [];
    for (const ci of items) {
      const product = ci.product;
      const stock = product.inventory?.quantity ?? 0;
      if (stock < ci.qty) return res.status(409).json({ error: `Insufficient stock for ${product.productKey}` });
      const unit = product.priceCents;
      const lineTotal = unit * ci.qty;
      totalCents += lineTotal;
      snapshots.push({
        productKey: product.productKey,
        productDbId: product.id,
        productName: product.name,
        qty: ci.qty,
        unitPriceCents: unit,
        lineTotalCents: lineTotal,
      });
    }

    const { name, email, phone, address, city, pin, notes } = req.body || {};
    const customerName = String(name || "").trim();
    const customerEmail = email ? String(email).trim() : null;
    const customerPhone = phone ? String(phone).trim() : null;
    const customerAddress = String(address || "").trim();
    const customerCity = city ? String(city).trim() : null;
    const customerPin = pin ? String(pin).trim() : null;
    const customerNotes = notes ? String(notes).trim() : null;

    if (!customerName || !customerAddress) {
      return res.status(400).json({ error: "name and address are required" });
    }

    const order = await prisma.order.create({
      data: {
        totalCents,
        customerName,
        customerEmail,
        customerPhone,
        address: customerAddress,
        city: customerCity,
        pin: customerPin,
        notes: customerNotes,
        userId: session.userId || null,
        items: {
          create: snapshots.map((s) => ({
            productId: s.productDbId,
            productName: s.productName,
            qty: s.qty,
            unitPriceCents: s.unitPriceCents,
            lineTotalCents: s.lineTotalCents,
          })),
        },
      },
      include: { items: true },
    });

    // Decrement inventory
    for (const ci of items) {
      const product = ci.product;
      const stock = product.inventory?.quantity ?? 0;
      const next = Math.max(0, stock - ci.qty);
      await prisma.inventory.update({
        where: { productId: product.id },
        data: { quantity: next },
      }).catch(() => {});
    }

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Create numeric-ish reference for UI
    const orderRef = `DA-${Date.now().toString(36).toUpperCase()}`;
    return res.json({ ok: true, orderRef, orderId: order.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[orders.create]", err?.message || err);
    return res.status(500).json({ error: "Failed to place order" });
  }
});

module.exports = router;

