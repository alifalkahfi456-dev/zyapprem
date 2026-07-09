# Premium Store — Toko Akun Premium

Website jual-beli akun premium dengan saldo/wallet, integrasi API premku.com,
dan bot Telegram monitoring. Frontend statis (untuk Vercel) + backend Node.js/Express
(untuk Railway/Render/VPS — **jangan** deploy backend ini di Vercel karena backend
butuh proses yang selalu hidup, bukan serverless function).

## Struktur folder

```
backend/
  index.js          # entry point server Express
  config.json        # bot Telegram, owner chat id, apikey premku, fee
  package.json
  saldo.json          # saldo per user + daftar device login
  database.json       # data users, transaksi, orders
  api.js              # integrasi API premku.com
  routes/
    auth.js           # register & login
    user.js           # profil & riwayat transaksi
    topup.js           # pengajuan topup
    admin.js           # panel admin (approve topup, users, dll)
  middleware/auth.js   # JWT guard
  utils/store.js       # helper baca/tulis file JSON aman
  utils/telegram.js    # kirim notifikasi ke bot Telegram

frontend/
  index.html          # login & registrasi
  dashboard.html       # halaman utama
  profile.html
  topup.html
  admin.html           # hanya bisa diakses akun role admin
  css/style.css        # tema biru glow + hitam
  js/                  # logic tiap halaman + wrapper API
  vercel.json
```

## Menjalankan backend (lokal / server)

```bash
cd backend
npm install
# edit config.json: isi jwtSecret, telegram.botToken, telegram.ownerChatId,
# premku.apiKey, dan corsOrigin sesuai domain frontend Anda
npm start
```

Backend berjalan di `http://localhost:5000` (atau `process.env.PORT` bila di-deploy).

Akun admin awal (seed otomatis saat database.json kosong):
- Email: sesuai `admin.seedEmail` di config.json (default `admin@store.com`)
- Password: sesuai `admin.seedPassword` (default `admin123`)
- **Segera login dan ganti password ini lewat halaman Profil setelah deploy.**

## Menjalankan frontend

Frontend adalah file statis murni (HTML/CSS/JS, tanpa build step), bisa langsung
dibuka atau di-deploy ke Vercel.

1. Edit `frontend/js/config.js`, ganti `window.__BACKEND_URL__` dengan URL publik
   backend Anda (contoh: `https://premium-store-api.up.railway.app`).
2. Deploy folder `frontend/` ke Vercel (drag-and-drop di dashboard, atau `vercel deploy`
   dari dalam folder `frontend/`).
3. Di `backend/config.json`, set `app.corsOrigin` ke domain Vercel Anda supaya
   permintaan dari frontend tidak diblokir CORS.

## Konfigurasi bot Telegram monitoring

1. Buat bot baru lewat @BotFather di Telegram, salin token-nya ke
   `config.json > telegram.botToken`.
2. Dapatkan chat ID Anda (misal lewat @userinfobot), isi ke
   `config.json > telegram.ownerChatId`.
3. Bot otomatis mengirim notifikasi saat: registrasi baru, login baru, permintaan
   topup, topup disetujui, dan pembelian akun premium.

## Integrasi API premku.com

Isi `config.json > premku.apiKey` dan sesuaikan `baseUrl` serta struktur endpoint
di `backend/api.js` mengikuti dokumentasi resmi API key premku.com Anda (path,
format request/response tiap provider bisa berbeda).

## Yang sudah diuji berjalan

Alur berikut sudah dites langsung dan berfungsi tanpa error:
register → login → lihat profil & saldo → ajukan topup → admin login →
admin setujui topup → saldo user otomatis bertambah.

## Yang perlu Anda lengkapi sendiri

- Isi kredensial asli di `config.json` (jwtSecret, bot Telegram, apikey premku).
- Sesuaikan endpoint di `api.js` dengan dokumentasi resmi premku.com (endpoint di
  file ini adalah struktur wrapper, bukan endpoint final yang sudah diverifikasi
  ke server premku.com).
- Untuk skala produksi/banyak pengguna, pertimbangkan migrasi dari file JSON
  (database.json, saldo.json) ke database sungguhan (PostgreSQL/MongoDB) karena
  penyimpanan berbasis file kurang cocok untuk trafik tinggi/concurrent write besar.
