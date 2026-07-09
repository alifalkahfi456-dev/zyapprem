const fs = require("fs");
const path = require("path");

// Antrian tulis per-file supaya tidak terjadi race condition saat beberapa
// request menulis ke file JSON yang sama secara bersamaan.
const writeQueues = new Map();

function filePath(name) {
  return path.join(__dirname, "..", name);
}

function readJSON(name, fallback) {
  const p = filePath(name);
  try {
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, JSON.stringify(fallback, null, 2));
      return JSON.parse(JSON.stringify(fallback));
    }
    const raw = fs.readFileSync(p, "utf-8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`[store] Gagal membaca ${name}:`, err.message);
    return fallback;
  }
}

function writeJSON(name, data) {
  const p = filePath(name);
  const prev = writeQueues.get(name) || Promise.resolve();
  const next = prev
    .then(
      () =>
        new Promise((resolve, reject) => {
          fs.writeFile(p, JSON.stringify(data, null, 2), (err) => {
            if (err) return reject(err);
            resolve();
          });
        })
    )
    .catch((err) => console.error(`[store] Gagal menulis ${name}:`, err.message));
  writeQueues.set(name, next);
  return next;
}

module.exports = { readJSON, writeJSON };
