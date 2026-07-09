const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readJSON, writeJSON } = require("../utils/store");
const { requireAuth } = require("../middleware/auth");
const config = require("../config");
const premku = require("../api");
const telegram = require("../utils/telegram");

const router = express.Router();

function applyMarkup(price) {
  return Math.round(price * (1 + config.fee.purchaseMarkupPercent / 100));
}

// GET /api/products — list produk dari premku
router.get("/", requireAuth, async (req, res) => {
  const remote = await premku.getProducts();

  if (!remote.success || !Array.isArray(remote.data?.products)) {
    return res.status(502).json({
      success: false,
      message: "Gagal mengambil produk dari premku.com.",
      detail: remote.error,
    });
  }

  // Filter hanya yang available, apply markup harga
  const products = remote.data.products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: applyMarkup(p.price),
    priceBase: p.price,
    status: p.status,       // "available" | "unavailable"
    stock: p.stock,
    image: p.image || null,
  }));

  res.json({ success: true, products });
});

// GET /api/products/:id/stock — cek stok realtime
router.get("/:id/stock", requireAuth, async (req, res) => {
  const result = await premku.getStock(req.params.id);
  if (!result.success) {
    return res.status(502).json({ success: false, message: "Gagal cek stok.", detail: result.error });
  }
  res.json({ success: true, stock: result.data.stock, product: result.data.product });
});

// POST /api/products/:id/buy — beli produk, potong saldo premku reseller langsung
router.post("/:id/buy", requireAuth, async (req, res) => {
  const productId = parseInt(req.params.id);
  const qty = parseInt(req.body.qty) || 1;

  const db = readJSON("database.json", { users: [], transactions: [], orders: [] });
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });

  // Cek stok dulu sebelum order
  const stockCheck = await premku.getStock(productId);
  if (!stockCheck.success || stockCheck.data.stock < qty) {
    return res.status(400).json({ success: false, message: "Stok produk tidak mencukupi." });
  }

  // ref_id harus unik — pakai UUID
  const refId = "REF-" + uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase();

  // Order ke premku — premku langsung potong saldo reseller
  const order = await premku.createOrder(productId, qty, refId);
  if (!order.success) {
    return res.status(400).json({
      success: false,
      message: order.error?.message || "Order gagal. Cek saldo reseller premku atau stok produk.",
      detail: order.error,
    });
  }

  const orderData = order.data;

  // Simpan order + transaksi ke DB lokal
  const localOrder = {
    id: uuidv4(),
    userId: user.id,
    productId,
    productName: orderData.product,
    qty,
    price: orderData.price,
    total: orderData.total,
    invoice: orderData.invoice,   // invoice premku untuk cek status
    refId,
    status: "processing",
    accounts: null,               // diisi saat status jadi "success"
    createdAt: new Date().toISOString(),
  };
  db.orders.push(localOrder);
  db.transactions.push({
    id: uuidv4(),
    userId: user.id,
    type: "purchase",
    amount: orderData.total,
    method: "saldo_premku",
    status: "processing",
    productName: orderData.product,
    invoice: orderData.invoice,
    createdAt: new Date().toISOString(),
  });
  await writeJSON("database.json", db);

  telegram.events.purchase(user, orderData.product, orderData.total);

  res.status(201).json({
    success: true,
    message: "Order diterima dan sedang diproses.",
    order: localOrder,
    balance_after: orderData.balance_after,
  });
});

// GET /api/products/order/:invoice/status — cek status order + ambil akun
router.get("/order/:invoice/status", requireAuth, async (req, res) => {
  const invoice = req.params.invoice;

  const result = await premku.getOrderStatus(invoice);
  if (!result.success) {
    return res.status(502).json({ success: false, message: "Gagal cek status order.", detail: result.error });
  }

  const statusData = result.data;

  // Kalau sudah sukses, update DB lokal dengan akun yang didapat
  if (statusData.status === "success" && Array.isArray(statusData.accounts)) {
    const db = readJSON("database.json", { users: [], transactions: [], orders: [] });
    const order = db.orders.find((o) => o.invoice === invoice && o.userId === req.user.id);
    if (order) {
      order.status = "success";
      order.accounts = statusData.accounts;
      // Update transaksi juga
      const trx = db.transactions.find((t) => t.invoice === invoice && t.userId === req.user.id);
      if (trx) trx.status = "success";
      await writeJSON("database.json", db);
    }
  }

  res.json({
    success: true,
    invoice: statusData.invoice,
    status: statusData.status,
    product: statusData.product,
    accounts: statusData.accounts || [],
  });
});

module.exports = router;
