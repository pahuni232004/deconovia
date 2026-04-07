/**
 * Shared product catalog — load before product.js and cart.js
 */
const BASE_PRODUCT_CATALOG = {
  "tower-1": {
    name: "Tower One",
    price: "Rs. 1,499/-",
    desc: "Our entry sculptural tower brings quiet greenery to any corner. Mist-fed roots stay tidy—no soil, no clutter—just a calm vertical accent for living rooms or home offices.",
    img: "./3D%20tower%20.png",
    detailLong:
      "Tower One is designed as an approachable introduction to vertical aeroponic decor. The internal mist channel keeps roots hydrated without soil, while the outer shell stays clean enough for open living spaces. Setup is straightforward: fill the reservoir, plug in the low-noise pump, and arrange your favourite small plants or herbs in the included cups. It’s sized for everyday homes—tall enough to feel architectural, slim enough for beside a sofa or reading nook.",
    included: [
      "Aeroponic tower body with integrated mist line",
      "Quiet USB-powered mist pump & tubing kit",
      "Plant cups (6) with support rings",
      "Reservoir lid with fill guide",
      "Quick-start setup sheet",
    ],
    material:
      "Matte ABS outer shell with UV-stable pigment; food-grade reservoir insert; silicone feet; anodized aluminum trim ring at the base. All exposed plastics are wipe-clean and rated for indoor humidity.",
    sampleReviews: [
      {
        author: "Ayesha K.",
        rating: 5,
        body: "Looks like a sculpture from the side and the plants are thriving. No soil on the floor—finally.",
        date: "2025-11-18",
      },
      {
        author: "Rohan M.",
        rating: 4,
        body: "Took about twenty minutes to set up. Pump is quieter than our old humidifier.",
        date: "2025-10-04",
      },
    ],
  },
  "tower-2": {
    name: "Tower Plus",
    price: "Rs. 1,699/-",
    desc: "Step up with wider planting tiers and smoother mist circulation. Ideal if you want fuller foliage and a bolder silhouette without redesigning the whole room.",
    img: "./3D%20tower%20.png",
    detailLong:
      "Tower Plus widens each growing tier so trailing plants and compact herbs have more room to spread. The mist path is tuned for even coverage top to bottom, which helps keep growth consistent if you mix species. It’s the sweet spot for renters and homeowners who want a stronger visual presence than Tower One without jumping to our largest footprint.",
    included: [
      "Plus-series tower with expanded tier spacing",
      "Upgraded mist pump (two flow presets)",
      "Plant cups (8) + spare mist nozzles (2)",
      "Reservoir with level window",
      "Setup guide & plant spacing tips",
    ],
    material:
      "Same durable ABS shell as Tower One with reinforced internal ribs; stainless-steel reservoir cap; braided silicone tubing; powder-coated steel base plate for stability.",
    sampleReviews: [
      {
        author: "Neha S.",
        rating: 5,
        body: "The extra cups matter—we run basil and mint together and they’re both happy.",
        date: "2025-12-01",
      },
    ],
  },
  "tower-3": {
    name: "Tower Pro",
    price: "Rs. 1,899/-",
    desc: "Built for design lovers who want performance to match the look. Deeper reservoir, refined trim, and a steadier grow rhythm for herbs and trailing plants alike.",
    img: "./3D%20tower%20.png",
    detailLong:
      "Tower Pro targets longer intervals between refills and a steadier mist rhythm for demanding plants. The deeper reservoir pairs with a refined controller-friendly pump housing, and the exterior trim is stepped for a sharper silhouette in photo-ready spaces. Ideal for open kitchens, studio apartments, and anyone who treats their greenery as part of the interior design brief.",
    included: [
      "Pro tower with extended reservoir",
      "Programmable mist pump (interval modes)",
      "Plant cups (10) + calibration key",
      "Magnetic service panel for nozzle access",
      "Care booklet & warranty card",
    ],
    material:
      "Premium matte composite shell; brushed aluminum collar; glass-view reservoir window; brass-tone accent inserts (PVD coated); reinforced base with hidden cable routing.",
    sampleReviews: [
      {
        author: "Vikram P.",
        rating: 5,
        body: "Worth it for the refill window alone. Feels very ‘designed’ in our loft.",
        date: "2025-09-22",
      },
      {
        author: "Elina D.",
        rating: 4,
        body: "Gorgeous finish. Took a day to dial in the mist schedule for ferns.",
        date: "2025-08-30",
      },
    ],
  },
  "tower-4": {
    name: "Tower Mini",
    price: "Rs. 1,199/-",
    desc: "Desk-sized drama: the same aeroponic idea in a footprint that fits shelves and WFH setups. Perfect as a starter piece or a gift that actually gets used.",
    img: "./3D%20tower%20.png",
    detailLong:
      "Tower Mini shrinks the system for desks, bedside tables, and narrow shelves. You still get true mist-fed roots—just fewer slots and a compact reservoir you can refill without moving furniture. It’s a strong gift option and a low-commitment way to try aeroponic decor before scaling up to a full-height tower.",
    included: [
      "Mini tower body",
      "Compact mist pump (USB-C)",
      "Plant cups (4)",
      "Mini reservoir & lid",
      "Sticker quick-start",
    ],
    material:
      "Lightweight ABS shell; soft-touch base ring; BPA-free reservoir; fabric-wrapped cord option in box (sage).",
    sampleReviews: [
      {
        author: "Chris L.",
        rating: 5,
        body: "Fits my desk next to the monitor. Colleagues always ask what it is.",
        date: "2025-11-08",
      },
    ],
  },
  "tower-5": {
    name: "Tower Max",
    price: "Rs. 2,099/-",
    desc: "The statement version—more height, more planting slots, more presence. Anchor a large wall or open-plan zone with a single piece that reads like living art.",
    img: "./3D%20tower%20.png",
    detailLong:
      "Tower Max is our floor-to-eye-level statement: maximum planting slots, tallest mist column, and a weighted base that stays planted in busy walkways. Use it to anchor a feature wall, divide an open plan softly, or create a green focal point in retail and hospitality-inspired home layouts. Refill cadence is longer thanks to the oversized reservoir, and the pump module is serviceable without tools.",
    included: [
      "Max-height tower assembly",
      "High-flow mist pump with dampening feet",
      "Plant cups (14) + extension riser kit",
      "XL reservoir with dual handles",
      "Pro assembly guide & video QR",
    ],
    material:
      "Heavy-duty ABS and internal aluminum spine; weighted steel base with felt floor protection; commercial-grade tubing; optional oak veneer sleeve panels (tool-free attach).",
    sampleReviews: [
      {
        author: "Priya R.",
        rating: 5,
        body: "Dominates our living room in the best way. Feels like an installation.",
        date: "2025-10-15",
      },
      {
        author: "Omar F.",
        rating: 4,
        body: "Heavy box—plan for two people. After that, maintenance is easy.",
        date: "2025-10-02",
      },
    ],
  },
};

function loadJsonArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadInventoryOverrides() {
  try {
    const raw = localStorage.getItem("decor-aeroponic-product-inventory");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadProductOverrides() {
  try {
    const raw = localStorage.getItem("decor-aeroponic-product-overrides");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function buildCatalog() {
  const merged = { ...BASE_PRODUCT_CATALOG };
  const adminProducts = loadJsonArray("decor-aeroponic-admin-products");
  adminProducts.forEach((p) => {
    if (!p || !p.id || !p.name || !p.price) return;
    merged[p.id] = {
      name: p.name,
      price: p.price,
      desc: p.desc || "Custom admin product.",
      img: p.img || "./3D%20tower%20.png",
      imgs: Array.isArray(p.imgs) && p.imgs.length ? p.imgs : [p.img || "./3D%20tower%20.png"],
      detailLong: p.detailLong || p.desc || "Custom admin product added from dashboard.",
      included: Array.isArray(p.included) ? p.included : ["Product unit"],
      material: p.material || "Details to be updated by admin.",
      sampleReviews: Array.isArray(p.sampleReviews) ? p.sampleReviews : [],
    };
  });
  const overrides = loadProductOverrides();
  Object.entries(overrides).forEach(([id, patch]) => {
    if (!merged[id] || !patch || typeof patch !== "object") return;
    merged[id] = {
      ...merged[id],
      ...patch,
      imgs: Array.isArray(patch.imgs) && patch.imgs.length ? patch.imgs : merged[id].imgs || [merged[id].img],
      included: Array.isArray(patch.included) ? patch.included : merged[id].included,
      sampleReviews: Array.isArray(patch.sampleReviews) ? patch.sampleReviews : merged[id].sampleReviews,
    };
  });

  // Demo gallery: repeat one existing image so thumbnail grid is visible for a base product.
  if (merged["tower-1"]) {
    const one = merged["tower-1"].img || "./3D%20tower%20.png";
    const imgs = Array.isArray(merged["tower-1"].imgs) ? merged["tower-1"].imgs.filter(Boolean) : [];
    if (imgs.length < 2) {
      merged["tower-1"].imgs = [one, one, one, one];
    }
  }
  return merged;
}

function buildInventory(catalog) {
  const overrides = loadInventoryOverrides();
  const inv = {};
  Object.keys(catalog).forEach((id) => {
    const n = Number(overrides[id]);
    inv[id] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 25;
  });
  return inv;
}

const PRODUCT_CATALOG = buildCatalog();
const PRODUCT_INVENTORY = buildInventory(PRODUCT_CATALOG);

window.BASE_PRODUCT_CATALOG = BASE_PRODUCT_CATALOG;
window.PRODUCT_CATALOG = PRODUCT_CATALOG;
window.PRODUCT_INVENTORY = PRODUCT_INVENTORY;
