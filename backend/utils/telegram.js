const axios = require("axios");
const config = require("../config.json");

/**
 * Kirim notifikasi ke Telegram owner (bot monitoring).
 * Dipakai untuk: registrasi baru, login baru, request topup, topup disetujui,
 * pembelian akun premium, dan alert saldo rendah.
 */
async function notifyOwner(message) {
  const { botToken, ownerChatId } = config.telegram;

  if (!botToken || botToken.startsWith("ISI_") || !ownerChatId || ownerChatId.startsWith("ISI_")) {
    console.warn("[telegram] Bot token / owner chat id belum diisi di config.json, notifikasi dilewati.");
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const { data } = await axios.post(url, {
      chat_id: ownerChatId,
      text: message,
      parse_mode: "HTML",
    });
    return data;
  } catch (err) {
    console.error("[telegram] Gagal mengirim notifikasi:", err.response?.data || err.message);
    return null;
  }
}

function fmtRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

module.exports = {
  notifyOwner,
  events: {
    newRegister: (user) =>
      notifyOwner(
        `<b>👤 Registrasi Baru</b>\nEmail: ${user.email}\nUser ID: ${user.id}\nWaktu: ${new Date().toLocaleString("id-ID")}`
      ),
    newLogin: (user, deviceId, ip) =>
      notifyOwner(
        `<b>🔐 Login Baru</b>\nEmail: ${user.email}\nDevice ID: ${deviceId}\nIP: ${ip || "-"}\nWaktu: ${new Date().toLocaleString("id-ID")}`
      ),
    topupRequest: (user, amount, method) =>
      notifyOwner(
        `<b>💰 Permintaan Topup</b>\nEmail: ${user.email}\nJumlah: ${fmtRupiah(amount)}\nMetode: ${method}\nWaktu: ${new Date().toLocaleString("id-ID")}`
      ),
    topupApproved: (user, amount) =>
      notifyOwner(
        `<b>✅ Topup Disetujui</b>\nEmail: ${user.email}\nJumlah: ${fmtRupiah(amount)}\nSaldo baru: ${fmtRupiah(user.balanceAfter)}`
      ),
    purchase: (user, productName, price) =>
      notifyOwner(
        `<b>🛒 Pembelian Akun Premium</b>\nEmail: ${user.email}\nProduk: ${productName}\nHarga: ${fmtRupiah(price)}`
      ),
    lowBalance: (user) =>
      notifyOwner(`<b>⚠️ Saldo Rendah</b>\nEmail: ${user.email}\nSisa saldo: ${fmtRupiah(user.balance)}`),
  },
};
