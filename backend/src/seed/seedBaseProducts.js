const prisma = require("../lib/prisma");

function priceLabelToCents(priceLabel) {
  const digits = String(priceLabel || "").replace(/[^\d]/g, "");
  const rupees = digits ? Number(digits) : 0;
  // cents/paise: 1 rupee = 100 paise
  return Math.max(0, Math.floor(rupees * 100));
}

async function seedBaseProductsIfEmpty() {
  const count = await prisma.product.count();
  if (count > 0) return;

  const base = [
    {
      productKey: "tower-1",
      name: "Tower One",
      priceLabel: "Rs. 1,499/-",
      desc: "Aeroponic tower centerpiece for modern living spaces.",
      detailLong: "Tower One is designed as an approachable introduction to vertical aeroponic decor.",
      material: "Matte ABS outer shell; food-grade reservoir insert; silicone feet.",
      imgPrimary: "./3D%20tower%20.png",
      imgGallery: ["./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png"],
    },
    {
      productKey: "tower-2",
      name: "Tower Plus",
      priceLabel: "Rs. 1,699/-",
      desc: "Wider tiers and smoother mist circulation for fuller foliage.",
      detailLong: "Tower Plus widens each growing tier so trailing plants and compact herbs have more room.",
      material: "Reinforced internal ribs; stainless-steel reservoir cap; braided silicone tubing.",
      imgPrimary: "./3D%20tower%20.png",
      imgGallery: ["./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png"],
    },
    {
      productKey: "tower-3",
      name: "Tower Pro",
      priceLabel: "Rs. 1,899/-",
      desc: "Refined trim and steadier grow rhythm for herbs and trailing plants.",
      detailLong: "Tower Pro targets longer intervals between refills and a steadier mist rhythm.",
      material: "Premium matte composite shell; brushed aluminum collar; reinforced base with cable routing.",
      imgPrimary: "./3D%20tower%20.png",
      imgGallery: ["./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png"],
    },
    {
      productKey: "tower-4",
      name: "Tower Mini",
      priceLabel: "Rs. 1,199/-",
      desc: "Desk-sized drama with true mist-fed roots in a compact footprint.",
      detailLong: "Tower Mini shrinks the system for desks, bedside tables, and narrow shelves.",
      material: "Lightweight ABS shell; soft-touch base ring; BPA-free reservoir.",
      imgPrimary: "./3D%20tower%20.png",
      imgGallery: ["./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png"],
    },
    {
      productKey: "tower-5",
      name: "Tower Max",
      priceLabel: "Rs. 2,099/-",
      desc: "Statement version with more planting slots and maximum presence.",
      detailLong: "Tower Max is our floor-to-eye-level statement with a larger reservoir and serviceable pump module.",
      material: "Heavy-duty ABS and internal aluminum spine; weighted steel base.",
      imgPrimary: "./3D%20tower%20.png",
      imgGallery: ["./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png", "./3D%20tower%20.png"],
    },
  ];

  for (const p of base) {
    // eslint-disable-next-line no-await-in-loop
    const created = await prisma.product.create({
      data: {
        productKey: p.productKey,
        name: p.name,
        priceCents: priceLabelToCents(p.priceLabel),
        priceLabel: p.priceLabel,
        desc: p.desc,
        detailLong: p.detailLong,
        included: [],
        material: p.material,
        imgPrimary: p.imgPrimary,
        imgGallery: p.imgGallery,
        inventory: {
          create: { quantity: 25 },
        },
      },
    });
    // eslint-disable-next-line no-unused-vars
    created;
  }
}

module.exports = { seedBaseProductsIfEmpty };

