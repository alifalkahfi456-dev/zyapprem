const express = require("express");
const { readJSON, writeJSON } = require("../utils/store");
const { requireAuth } = require("../middleware/auth");
const bcrypt = require("bcryptjs");

const router = express.Router();

// GET /api/user/me
router.get("/me", requireAuth, (req, res) => {
  const db = readJSON("database.json", { users: [] });
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });

  const saldo = readJSON("saldo.json", { balances: {} });
  const balanceInfo = saldo.balances[user.id] || { balance: 0, devices: [] };

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      balance: balanceInfo.balance,
      devices: balanceInfo.devices.length,
    },
  });
});

// PUT /api/user/me — update nama / password
router.put("/me", requireAuth, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const db = readJSON("database.json", { users: [] });
  const idx = db.users.findIndex((u) => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });

  if (name) db.users[idx].name = name;

  if (newPassword) {
    const match = await bcrypt.compare(currentPassword || "", db.users[idx].password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Password saat ini salah." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter." });
    }
    db.users[idx].password = await bcrypt.hash(newPassword, 10);
  }

  await writeJSON("database.json", db);
  res.json({ success: true, message: "Profil berhasil diperbarui." });
});

// GET /api/user/transactions — riwayat transaksi milik user
router.get("/transactions", requireAuth, (req, res) => {
  const db = readJSON("database.json", { transactions: [] });
  const list = db.transactions
    .filter((t) => t.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, transactions: list });
});

module.exports = router;
