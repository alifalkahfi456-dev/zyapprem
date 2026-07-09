// ============================================================
// Konfigurasi koneksi ke backend Node.js.
// Ganti BASE_URL sesuai alamat backend Anda saat deploy
// (backend TIDAK dideploy di Vercel bersama frontend ini —
// gunakan Railway / Render / VPS, lalu isi URL publiknya di sini).
// ============================================================
const API = {
  BASE_URL: window.__BACKEND_URL__ || "http://localhost:5000",

  getToken() {
    return localStorage.getItem("ps_token");
  },
  setSession({ token, user, deviceId }) {
    localStorage.setItem("ps_token", token);
    localStorage.setItem("ps_user", JSON.stringify(user));
    if (deviceId) localStorage.setItem("ps_device", deviceId);
  },
  clearSession() {
    localStorage.removeItem("ps_token");
    localStorage.removeItem("ps_user");
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("ps_user") || "null");
    } catch {
      return null;
    }
  },
  getDeviceId() {
    let id = localStorage.getItem("ps_device");
    if (!id) {
      id = "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("ps_device", id);
    }
    return id;
  },

  async request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    let res, data;
    try {
      res = await fetch(`${this.BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      data = await res.json();
    } catch (err) {
      throw new Error("Tidak bisa terhubung ke server. Pastikan backend berjalan.");
    }
    if (!res.ok) {
      if (res.status === 401) {
        this.clearSession();
        if (!location.pathname.endsWith("index.html") && location.pathname !== "/") {
          location.href = "index.html";
        }
      }
      throw new Error(data.message || "Terjadi kesalahan.");
    }
    return data;
  },
};

// ---------- Toast notification ----------
function showToast(message, type = "default") {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.className = `toast ${type}`;
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 3200);
}

// ---------- Guard halaman ----------
function requireLogin() {
  if (!API.getToken()) {
    location.href = "index.html";
  }
}
function requireAdmin() {
  requireLogin();
  const user = API.getUser();
  if (!user || user.role !== "admin") {
    location.href = "dashboard.html";
  }
}
function redirectIfLoggedIn() {
  if (API.getToken()) {
    const user = API.getUser();
    location.href = user?.role === "admin" ? "admin.html" : "dashboard.html";
  }
}

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}
function formatDate(iso) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
function initials(name) {
  return (name || "?").trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
