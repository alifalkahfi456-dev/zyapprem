const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readJSON, writeJSON } = require("../utils/store");
const { requireAuth } = require("../middleware/auth");
const config = require("../config");
const premku = require("../api");
const telegram = require("../utils/telegram");

const router = express.Router();

// POST /api/topup/request — buat deposit QRIS via premku
router.post("/request", requireAuth, async (req, res) => {
  const { amount } = req.body;
  const nominal = Number(amount);

  if (!nominal || nominal < config.fee.minTopup || nominal > config.fee.maxTopup) {
    return res.status(400).json({
      success: false,
      message: `Nominal harus antara Rp${config.fee.minTopup.toLocaleString("id-ID")} - Rp${config.fee.maxTopup.toLocaleString("id-ID")}.`,
    });
  }

  const db = readJSON("database.json", { users: [], transactions: [] });
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });

  const deposit = await premku.createDeposit(nominal);
  if (!deposit.success) {
    return res.status(502).json({
      success: false,
      message: "Gagal membuat deposit ke premku.com. Coba lagi.",
      detail: deposit.error,
    });
  }

  // premku return: { success, message, data: { invoice, ... } }
  const depositData = deposit.data.data || deposit.data;
  const premkuInvoice = depositData.invoice;

  const trx = {
    id: uuidv4(),
    userId: user.id,
    type: "topup",
    amount: nominal,
    fee: 0,
    method: "qris_premku",
    status: "pending",
    premkuInvoice,          // invoice dari premku untuk cek status & cancel
    premkuData: depositData,
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(trx);
  await writeJSON("database.json", db);

  telegram.events.topupRequest(user, nominal, "QRIS Premku");

  res.status(201).json({
    success: true,
    message: "Deposit dibuat. Scan QRIS untuk bayar.",
    transaction: trx,
    qris: depositData,
  });
});

// POST /api/topup/status — cek status deposit ke premku (dipakai frontend polling)
router.post("/status", requireAuth, async (req, res) => {
  const { invoice, trxId } = req.body;

  // Cari trx di DB kita
  const db = readJSON("database.json", { users: [], transactions: [] });
  const trx = db.transactions.find(
    (t) => t.userId === req.user.id && (t.id === trxId || t.premkuInvoice === invoice)
  );
  if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });

  // Kalau sudah approved di DB, return langsung
  if (trx.status === "approved") {
    return res.json({ success: true, status: "approved", transaction: trx });
  }

  // Tanya premku langsung — POST /api/pay_status
  // Response: { success, message, data: { invoice, status, total_bayar, qr_raw } }
  const premkuInvoice = trx.premkuInvoice || invoice;
  const check = await premku.getDepositStatus(premkuInvoice);

  if (!check.success) {
    return res.status(502).json({ success: false, message: "Gagal cek status ke premku.", detail: check.error });
  }

  const remoteStatus = check.data.data?.status || check.data.status;

  // Kalau premku bilang sukses, update DB dan tambah saldo
  if (remoteStatus === "success" || remoteStatus === "paid") {
    const saldo = readJSON("saldo.json", { balances: {} });
    if (!saldo.balances[trx.userId]) saldo.balances[trx.userId] = { balance: 0 };
    saldo.balances[trx.userId].balance += trx.amount;

    trx.status = "approved";
    trx.approvedAt = new Date().toISOString();

    await writeJSON("database.json", db);
    await writeJSON("saldo.json", saldo);

    const user = db.users.find((u) => u.id === req.user.id);
    if (user) telegram.events.topupApproved(user, trx.amount);

    return res.json({ success: true, status: "approved", transaction: trx });
  }

  res.json({ success: true, status: remoteStatus || "pending", transaction: trx });
});

// POST /api/topup/cancel — batalkan deposit pending
router.post("/cancel", requireAuth, async (req, res) => {
  const { trxId } = req.body;

  const db = readJSON("database.json", { users: [], transactions: [] });
  const trx = db.transactions.find((t) => t.id === trxId && t.userId === req.user.id);

  if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });
  if (trx.status !== "pending") {
    return res.status(400).json({ success: false, message: "Hanya deposit pending yang bisa dibatalkan." });
  }

  const cancel = await premku.cancelDeposit(trx.premkuInvoice);
  if (!cancel.success) {
    return res.status(502).json({ success: false, message: "Gagal membatalkan deposit di premku.", detail: cancel.error });
  }

  trx.status = "rejected";
  trx.canceledAt = new Date().toISOString();
  await writeJSON("database.json", db);

  res.json({ success: true, message: "Deposit berhasil dibatalkan." });
});

module.exports = router;
