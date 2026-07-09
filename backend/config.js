// ============================================================
// Config loader — mendukung 2 cara:
// 1. backend/config.json (buat run lokal / VPS)
// 2. Environment variables (buat Railway/Render/Vercel/dsb)
//
// Env var, kalau di-set, akan MENIMPA nilai dari config.json.
// Kalau config.json ga ada sama sekali (misal di Railway, karena
// file ini sengaja di-.gitignore), app tetap jalan pakai default
// + env var yang di-set di dashboard hosting.
// ============================================================
const fs = require("fs");
const path = require("path");

let fileConfig = {};
const configPath = path.join(__dirname, "config.json");
if (fs.existsSync(configPath)) {
  fileConfig = require(configPath);
}

function pick(envVal, fallback) {
  return envVal !== undefined && envVal !== "" ? envVal : fallback;
}

const config = {
  app: {
    name: pick(process.env.APP_NAME, fileConfig.app?.name || "Premium Store"),
    port: Number(pick(process.env.PORT, fileConfig.app?.port || 5000)),
    jwtSecret: pick(
      process.env.JWT_SECRET,
      fileConfig.app?.jwtSecret || "ganti-secret-ini-di-config-atau-env"
    ),
    jwtExpiresIn: pick(process.env.JWT_EXPIRES_IN, fileConfig.app?.jwtExpiresIn || "7d"),
    corsOrigin: pick(process.env.CORS_ORIGIN, fileConfig.app?.corsOrigin || "*"),
  },
  telegram: {
    botToken: pick(process.env.TELEGRAM_BOT_TOKEN, fileConfig.telegram?.botToken || ""),
    ownerChatId: pick(process.env.TELEGRAM_OWNER_CHAT_ID, fileConfig.telegram?.ownerChatId || ""),
    notify: fileConfig.telegram?.notify || {
      newRegister: true,
      newLogin: true,
      topupRequest: true,
      topupApproved: true,
      purchase: true,
      lowBalanceAlert: 5000,
    },
  },
  premku: {
    baseUrl: pick(process.env.PREMKU_BASE_URL, fileConfig.premku?.baseUrl || "https://premku.com/api"),
    apiKey: pick(process.env.PREMKU_API_KEY, fileConfig.premku?.apiKey || ""),
    timeoutMs: Number(pick(process.env.PREMKU_TIMEOUT_MS, fileConfig.premku?.timeoutMs || 15000)),
  },
  fee: fileConfig.fee || {
    topupPercent: 0,
    topupFlat: 0,
    purchaseMarkupPercent: 5,
    minTopup: 10000,
    maxTopup: 5000000,
  },
  admin: {
    seedEmail: pick(process.env.ADMIN_SEED_EMAIL, fileConfig.admin?.seedEmail || "admin@store.com"),
    seedPassword: pick(process.env.ADMIN_SEED_PASSWORD, fileConfig.admin?.seedPassword || "admin123"),
    note:
      fileConfig.admin?.note ||
      "Password seed ini hanya dipakai sekali saat database.json kosong. Segera ganti setelah login pertama.",
  },
};

module.exports = config;
