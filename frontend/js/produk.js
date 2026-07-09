requireLogin();

let currentBalance = 0;

async function loadHeader() {
  const { user } = await API.request("/api/user/me");
  document.getElementById("avatarInitials").textContent = initials(user.name);
  document.getElementById("chipName").textContent = user.name;
  document.getElementById("headerBalance").textContent = formatRupiah(user.balance);
  currentBalance = user.balance;
  if (user.role === "admin") {
    document.getElementById("navAdmin").classList.remove("hidden");
    document.getElementById("navAdmin").href = "admin.html";
  }
}

async function loadProducts() {
  const grid = document.getElementById("productGrid");
  try {
    const { products } = await API.request("/api/products");
    if (!products || products.length === 0) {
      grid.innerHTML = `<p class="text-muted">Belum ada produk tersedia.</p>`;
      return;
    }
    grid.innerHTML = products.map((p) => {
      const unavailable = p.status === "unavailable" || p.stock === 0;
      return `
      <div class="product-card ${unavailable ? "product-unavailable" : ""}">
        <div class="product-icon-wrap">
          ${p.image
            ? `<img src="${p.image}" alt="${p.name}" class="product-img" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
               <div class="product-icon-fallback" style="display:none">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="#5ec8ff" stroke-width="1.6"/><path d="M8 12H16M12 8V16" stroke="#5ec8ff" stroke-width="1.6" stroke-linecap="round"/></svg>
               </div>`
            : `<div class="product-icon">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="#5ec8ff" stroke-width="1.6"/><path d="M8 12H16M12 8V16" stroke="#5ec8ff" stroke-width="1.6" stroke-linecap="round"/></svg>
               </div>`
          }
        </div>
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:4px;">${p.name}</h3>
          <p class="text-sm">${p.description || ""}</p>
          <p class="text-sm mt-8" style="color:${unavailable ? "var(--danger)" : "var(--success)"}">
            ${unavailable ? "● Stok habis" : `● Stok ${p.stock}`}
          </p>
        </div>
        <div class="flex-between">
          <span class="product-price">${formatRupiah(p.price)}</span>
          <button
            class="btn btn-primary"
            style="width:auto;padding:10px 18px;font-size:14px;"
            data-id="${p.id}"
            data-name="${p.name}"
            data-price="${p.price}"
            ${unavailable ? "disabled" : ""}
          >Beli</button>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleBuy(btn.dataset.id, btn.dataset.name, btn.dataset.price, btn)
      );
    });
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

// Modal akun
function showAccountModal(productName, accounts) {
  const modal = document.getElementById("accountModal");
  document.getElementById("accountModalTitle").textContent = productName;
  const list = document.getElementById("accountList");
  list.innerHTML = accounts.map((a) => `
    <div class="account-item">
      <div class="account-row">
        <span class="account-label">Email / Username</span>
        <span class="account-val">${a.username}</span>
        <button class="btn-copy" onclick="copyText('${a.username}', this)">Salin</button>
      </div>
      <div class="account-row">
        <span class="account-label">Password</span>
        <span class="account-val">${a.password}</span>
        <button class="btn-copy" onclick="copyText('${a.password}', this)">Salin</button>
      </div>
    </div>`).join('<div class="account-divider"></div>');
  modal.classList.add("active");
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "✓";
    setTimeout(() => btn.textContent = "Salin", 1500);
  });
}

document.getElementById("btnCloseAccount").addEventListener("click", () => {
  document.getElementById("accountModal").classList.remove("active");
});

async function handleBuy(id, name, price, btn) {
  if (Number(price) > currentBalance) {
    showToast("Saldo tidak cukup. Topup dulu ya!", "error");
    return;
  }
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = "Memproses...";

  try {
    const data = await API.request(`/api/products/${id}/buy`, { method: "POST", body: { qty: 1 } });
    showToast("Order masuk! Mengambil akun...", "success");
    loadHeader();

    // Polling status order sampai dapat akun (max 30 detik)
    const invoice = data.order.invoice;
    let tries = 0;
    const poll = setInterval(async () => {
      tries++;
      try {
        const status = await API.request(`/api/products/order/${invoice}/status`);
        if (status.status === "success" && status.accounts?.length > 0) {
          clearInterval(poll);
          showAccountModal(name, status.accounts);
          loadProducts(); // refresh stok
        }
      } catch (_) {}
      if (tries >= 6) {
        clearInterval(poll);
        showToast("Akun sedang diproses. Cek riwayat transaksi.", "default");
      }
    }, 5000);

  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

document.getElementById("btnLogout").addEventListener("click", () => {
  API.clearSession();
  location.href = "index.html";
});

loadHeader();
loadProducts();
