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

  // Ensure cart exists for this session.
  await prisma.cart.upsert({
    where: { sessionId: session.id },
    update: {},
    create: { sessionId: session.id },
  });
  return session;
}

async function getCart(sessionId) {
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: true },
  });
  return cart;
}

function normalizeCartItem(item, product) {
  return {
    productId: product.productKey,
    productKey: product.productKey,
    qty: item.qty,
    name: product.name,
    priceLabel: product.priceLabel,
    priceCents: product.priceCents,
    img: product.imgPrimary || (product.imgGallery && Array.isArray(product.imgGallery) ? product.imgGallery[0] : ""),
  };
}

router.get("/", async (req, res) => {
  try {
    const session = await getOrCreateSession(req, res);
    const cart = await prisma.cart.findUnique({
      where: { sessionId: session.id },
      include: { items: { include: { product: true } } },
    });

    const items = (cart?.items || []).map((ci) => ({
      productId: ci.product.productKey,
      productKey: ci.product.productKey,
      qty: ci.qty,
      name: ci.product.name,
      price: ci.product.priceLabel,
      priceCents: ci.product.priceCents,
      img: ci.product.imgPrimary,
      inventory: ci.product.inventory?.quantity ?? 0,
    }));

    return res.json({ items });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart.get]", err?.message || err);
    return res.status(500).json({ error: "Failed to load cart" });
  }
});

router.post("/items", async (req, res) => {
  try {
    const { productKey, qty } = req.body || {};
    const q = Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));
    const key = String(productKey || "").trim();
    if (!key) return res.status(400).json({ error: "productKey required" });

    const session = await getOrCreateSession(req, res);
    const cart = await prisma.cart.findUnique({ where: { sessionId: session.id } });
    if (!cart) return res.status(500).json({ error: "Cart missing" });

    const product = await prisma.product.findUnique({
      where: { productKey: key },
      include: { inventory: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const stock = product.inventory?.quantity ?? 0;
    if (stock <= 0) return res.status(409).json({ error: "Out of stock" });

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    }).catch(() => null);

    const currentQty = existing?.qty ?? 0;
    const nextQty = Math.min(stock, 99, currentQty + q);

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      create: { cartId: cart.id, productId: product.id, qty: nextQty },
      update: { qty: nextQty },
    });

    return res.json({ ok: true, qty: nextQty });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart.add]", err?.message || err);
    return res.status(500).json({ error: "Failed to add to cart" });
  }
});

router.patch("/items/:productKey", async (req, res) => {
  try {
    const { productKey } = req.params;
    const { qty } = req.body || {};
    const q = Math.floor(Number(qty) || 0);

    const session = await getOrCreateSession(req, res);
    const cart = await prisma.cart.findUnique({ where: { sessionId: session.id } });
    if (!cart) return res.status(500).json({ error: "Cart missing" });

    const product = await prisma.product.findUnique({
      where: { productKey: String(productKey || "") },
      include: { inventory: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const stock = product.inventory?.quantity ?? 0;
    if (q <= 0) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId: product.id } });
      return res.json({ ok: true, deleted: true });
    }

    const nextQty = Math.min(stock, 99, Math.max(1, q));
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      create: { cartId: cart.id, productId: product.id, qty: nextQty },
      update: { qty: nextQty },
    });
    return res.json({ ok: true, qty: nextQty });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart.qty]", err?.message || err);
    return res.status(500).json({ error: "Failed to update cart qty" });
  }
});

router.delete("/items/:productKey", async (req, res) => {
  try {
    const { productKey } = req.params;
    const session = await getOrCreateSession(req, res);
    const cart = await prisma.cart.findUnique({ where: { sessionId: session.id } });
    if (!cart) return res.status(500).json({ error: "Cart missing" });

    const product = await prisma.product.findUnique({ where: { productKey: String(productKey || "") } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId: product.id } });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart.delete]", err?.message || err);
    return res.status(500).json({ error: "Failed to remove item" });
  }
});

module.exports = router;

