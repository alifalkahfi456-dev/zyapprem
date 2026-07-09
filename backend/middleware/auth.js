const jwt = require("jsonwebtoken");
const config = require("../config.json");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Token tidak ditemukan, silakan login kembali." });
  }

  try {
    const payload = jwt.verify(token, config.app.jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Sesi tidak valid atau sudah kedaluwarsa." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Akses khusus admin." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
