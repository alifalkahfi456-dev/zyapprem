const express = require("express");
const { readJSON, writeJSON } = require("../utils/store");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const telegram = require("../utils/telegram");
const premku = require("../api");
const config = require("../config");

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/overview — ringkasan untuk dashboard admin
router.get("/overview", (req, res) => {
  const db = readJSON("database.json", { users: [], transactions: [], orders: [] });
  const saldo = readJSON("saldo.json", { balances: {} });

  const totalUsers = db.users.filter((u) => u.role === "user").length;
  const totalBalance = Object.values(saldo.balances).reduce((sum, b) => sum + (b.balance || 0), 0);
  const pendingTopups = db.transactions.filter((t) => t.type === "topup" && t.status === "pending").length;
  const totalOrders = db.orders.length;

  res.json({
    success: true,
    overview: { totalUsers, totalBalance, pendingTopups, totalOrders },
  });
});

// GET /api/admin/users — daftar semua user + saldo
router.get("/users", (req, res) => {
  const db = readJSON("database.json", { users: [] });
  const saldo = readJSON("saldo.json", { balances: {} });

  const users = db.users
    .filter((u) => u.role === "user")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      balance: saldo.balances[u.id]?.balance || 0,
      devices: saldo.balances[u.id]?.devices?.length || 0,
    }));

  res.json({ success: true, users });
});

// GET /api/admin/transactions — semua transaksi (topup & pembelian)
router.get("/transactions", (req, res) => {
  const db = readJSON("database.json", { transactions: [] });
  const list = [...db.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, transactions: list });
});

// POST /api/admin/topup/:id/approve — setujui topup, tambahkan saldo user
router.post("/topup/:id/approve", async (req, res) => {
  const db = readJSON("database.json", { users: [], transactions: [] });
  const trx = db.transactions.find((t) => t.id === req.params.id && t.type === "topup");

  if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });
  if (trx.status !== "pending") {
    return res.status(400).json({ success: false, message: "Transaksi ini sudah diproses sebelumnya." });
  }

  trx.status = "approved";
  trx.approvedAt = new Date().toISOString();
  await writeJSON("database.json", db);

  const saldo = readJSON("saldo.json", { balances: {} });
  if (!saldo.balances[trx.userId]) saldo.balances[trx.userId] = { balance: 0, devices: [] };
  saldo.balances[trx.userId].balance += trx.amount;
  await writeJSON("saldo.json", saldo);

  const user = db.users.find((u) => u.id === trx.userId);
  telegram.events.topupApproved(
    { ...user, balanceAfter: saldo.balances[trx.userId].balance },
    trx.amount
  );

  res.json({ success: true, message: "Topup disetujui, saldo user sudah ditambahkan." });
});

// POST /api/admin/topup/:id/reject
router.post("/topup/:id/reject", async (req, res) => {
  const db = readJSON("database.json", { transactions: [] });
  const trx = db.transactions.find((t) => t.id === req.params.id && t.type === "topup");
  if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });
  if (trx.status !== "pending") {
    return res.status(400).json({ success: false, message: "Transaksi ini sudah diproses sebelumnya." });
  }
  trx.status = "rejected";
  trx.rejectedAt = new Date().toISOString();
  await writeJSON("database.json", db);
  res.json({ success: true, message: "Topup ditolak." });
});

// GET /api/admin/products — proxy daftar produk dari premku.com
router.get("/products", async (req, res) => {
  const result = await premku.getProducts();
  if (!result.success) {
    return res.status(502).json({ success: false, message: "Gagal mengambil produk dari premku.com", detail: result.error });
  }
  res.json({ success: true, products: result.data });
});

// GET /api/admin/settings — lihat pengaturan fee & info umum (tanpa membocorkan secret penuh)
router.get("/settings", (req, res) => {
  res.json({
    success: true,
    settings: {
      fee: config.fee,
      telegramConfigured: !config.telegram.botToken.startsWith("ISI_"),
      premkuConfigured: !config.premku.apiKey.startsWith("ISI_"),
    },
  });
});

module.exports = router;
