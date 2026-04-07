const crypto = require("crypto");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  const salt = crypto.randomBytes(8).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(String(otp)).digest("hex");
  return `${salt}:${hash}`;
}

function verifyOtp(otp, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = String(stored).split(":");
  const candidate = crypto.createHmac("sha256", salt).update(String(otp)).digest("hex");
  const a = Buffer.from(String(candidate), "hex");
  const b = Buffer.from(String(hash), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateOtp, hashOtp, verifyOtp };

