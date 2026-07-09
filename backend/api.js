const axios = require("axios");
const config = require("./config");

const client = axios.create({
  baseURL: config.premku.baseUrl, // https://premku.com/api
  timeout: config.premku.timeoutMs,
  headers: { "Content-Type": "application/json" },
});

async function safeCall(fn) {
  try {
    const { data } = await fn();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message || "Gagal menghubungi premku.com",
    };
  }
}

const k = () => config.premku.apiKey;

module.exports = {
  // POST /api/products — list semua produk
  // Response: { success, products: [{ id, name, description, price, status, stock, image }] }
  getProducts: () =>
    safeCall(() => client.post("/products", { api_key: k() })),

  // POST /api/stock — cek stok realtime satu produk
  // Response: { success, product, stock }
  getStock: (product_id) =>
    safeCall(() => client.post("/stock", { api_key: k(), product_id: parseInt(product_id) })),

  // POST /api/order — buat pesanan, langsung potong saldo premku reseller
  // Response: { success, invoice, product, qty, price, total, balance_before, balance_after }
  createOrder: (product_id, qty, ref_id) =>
    safeCall(() =>
      client.post("/order", {
        api_key: k(),
        product_id: parseInt(product_id),
        qty: parseInt(qty) || 1,
        ref_id: ref_id, // unique per order, pakai UUID kita
      })
    ),

  // POST /api/status — cek status order + dapat akun (username/password)
  // Response: { success, invoice, status, product, accounts: [{ username, password }] }
  getOrderStatus: (invoice) =>
    safeCall(() => client.post("/status", { api_key: k(), invoice })),

  // POST /api/pay — buat deposit QRIS
  // Response: { success, message, data: { invoice, ... qris data } }
  createDeposit: (amount) =>
    safeCall(() => client.post("/pay", { api_key: k(), amount: parseInt(amount) })),

  // POST /api/pay_status — cek status deposit
  // Response: { success, message, data: { invoice, status, total_bayar, qr_raw } }
  getDepositStatus: (invoice) =>
    safeCall(() => client.post("/pay_status", { api_key: k(), invoice })),

  // POST /api/cancel_pay — batalkan deposit pending
  // Response: { success, message, data: { invoice, status_old, status_new } }
  cancelDeposit: (invoice) =>
    safeCall(() => client.post("/cancel_pay", { api_key: k(), invoice })),

  // POST /api/profile — cek saldo reseller di premku
  // Response: { success, data: { username, whatsapp, saldo, registered_at } }
  getProfile: () =>
    safeCall(() => client.post("/profile", { api_key: k() })),
};
