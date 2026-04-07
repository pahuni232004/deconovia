const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

function toProductClientShape(p, inventory, offer, reviewsPreview) {
  const imgs = Array.isArray(p.imgGallery) ? p.imgGallery : [];
  const gallery = imgs.length ? imgs : p.imgPrimary ? [p.imgPrimary] : [];
  return {
    productKey: p.productKey,
    name: p.name,
    price: p.priceLabel,
    priceCents: p.priceCents,
    desc: p.desc || "",
    detailLong: p.detailLong || "",
    material: p.material || "",
    img: p.imgPrimary || gallery[0] || "",
    imgs: gallery.length ? gallery : p.imgPrimary ? [p.imgPrimary] : [],
    inventory: inventory?.quantity ?? 0,
    offer: offer ? { label: offer.label || "", pct: offer.pct, active: offer.active } : null,
    sampleReviews: reviewsPreview || [],
  };
}

router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "asc" },
      take: 1000,
      include: {
        inventory: true,
        offer: true,
      },
    });

    return res.json({
      products: products.map((p) =>
        toProductClientShape(p, p.inventory, p.offer, undefined)
      ),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[products.list]", err?.message || err);
    return res.status(500).json({ error: "Failed to load products" });
  }
});

router.get("/:productKey", async (req, res) => {
  try {
    const { productKey } = req.params;
    const p = await prisma.product.findUnique({
      where: { productKey },
      include: { inventory: true, offer: true, reviews: true },
    });
    if (!p) return res.status(404).json({ error: "Product not found" });

    // Reviews: full list
    const reviews = (p.reviews || []).slice(0, 200).map((r) => ({
      author: r.author,
      rating: r.rating,
      body: r.body,
      date: r.createdAt.toISOString().slice(0, 10),
    }));

    // Convert to old frontend shape.
    const clientProduct = toProductClientShape(p, p.inventory, p.offer, reviews);
    return res.json({ product: clientProduct });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[products.get]", err?.message || err);
    return res.status(500).json({ error: "Failed to load product" });
  }
});

router.get("/:productKey/reviews", async (req, res) => {
  try {
    const { productKey } = req.params;
    const p = await prisma.product.findUnique({
      where: { productKey },
      include: { reviews: true },
    });
    if (!p) return res.status(404).json({ error: "Product not found" });
    const reviews = (p.reviews || []).map((r) => ({
      author: r.author,
      rating: r.rating,
      body: r.body,
      date: r.createdAt.toISOString().slice(0, 10),
    }));
    return res.json({ reviews });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[products.reviews.get]", err?.message || err);
    return res.status(500).json({ error: "Failed to load reviews" });
  }
});

router.post("/:productKey/reviews", async (req, res) => {
  try {
    const { productKey } = req.params;
    const { author, rating, body } = req.body || {};
    const a = String(author || "").trim();
    const b = String(body || "").trim();
    const r = Number(rating);
    if (!a || !b || !Number.isFinite(r)) return res.status(400).json({ error: "author, rating, body required" });
    const ratingInt = Math.min(5, Math.max(1, Math.floor(r)));

    const product = await prisma.product.findUnique({ where: { productKey } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const created = await prisma.review.create({
      data: {
        productId: product.id,
        author: a,
        rating: ratingInt,
        body: b,
      },
    });

    return res.json({ ok: true, review: created });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[products.reviews.post]", err?.message || err);
    return res.status(500).json({ error: "Failed to save review" });
  }
});

module.exports = router;

