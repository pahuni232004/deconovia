const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const apiRouter = require("./routes/api");

const app = express();

// Basic hardening against accidental bursts from misbehaving clients.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 600,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? String(process.env.CORS_ORIGIN) : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve the static frontend (same repo) so the frontend can call `/api/*` relative URLs.
const projectRoot = path.resolve(__dirname, "..", "..");
app.use(express.static(projectRoot));

// API routes under `/api/*`
app.use("/api", apiRouter);

// SPA/Static fallback: let Express static handle existing files; otherwise return 404.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

module.exports = app;

