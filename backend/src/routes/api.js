const express = require("express");
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    at: new Date().toISOString(),
  });
});

const authRoutes = require("./auth");
router.use("/auth", authRoutes);

const adminRoutes = require("./admin");
router.use("/admin", adminRoutes);

const productsRoutes = require("./products");
router.use("/products", productsRoutes);

const cartRoutes = require("./cart");
router.use("/cart", cartRoutes);

const ordersRoutes = require("./orders");
router.use("/orders", ordersRoutes);

const contactRoutes = require("./contact");
router.use("/contact", contactRoutes);

module.exports = router;

