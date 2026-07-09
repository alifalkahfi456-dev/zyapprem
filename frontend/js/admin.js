requireAdmin();

async function loadHeader() {
  const { user } = await API.request("/api/user/me");
  document.getElementById("avatarInitials").textContent = initials(user.name);
  document.getElementById("chipName").textContent = user.name;
}

async function loadOverview() {
  const { overview } = await API.request("/api/admin/overview");
  document.getElementById("statUsers").textContent = overview.totalUsers;
  document.getElementById("statBalance").textContent = formatRupiah(overview.totalBalance);
  document.getElementById("statPending").textContent = overview.pendingTopups;
  document.getElementById("statOrders").textContent = overview.totalOrders;
}

async function loadPendingTopups() {
  const { transactions } = await API.request("/api/admin/transactions");
  const pending = transactions.filter((t) => t.type === "topup" && t.status === "pending");
  const body = document.getElementById("pendingBody");

  if (pending.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="text-muted">Tidak ada permintaan topup yang menunggu.</td></tr>`;
    return;
  }

  body.innerHTML = pending
    .map(
      (t) => `
    <tr>
      <td>${formatDate(t.createdAt)}</td>
      <td class="text-sm">${t.userId.slice(0, 8)}...</td>
      <td>${formatRupiah(t.amount)}</td>
      <td style="text-transform:uppercase;">${t.method}</td>
      <td><span class="badge badge-pending">Menunggu</span></td>
      <td>
        <div class="flex gap-8">
          <button class="btn-sm btn-primary" style="width:auto;" data-approve="${t.id}">Setujui</button>
          <button class="btn-sm btn-danger" style="width:auto;" data-reject="${t.id}">Tolak</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", () => handleTopupAction(btn.dataset.approve, "approve"))
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", () => handleTopupAction(btn.dataset.reject, "reject"))
  );
}

async function handleTopupAction(id, action) {
  try {
    await API.request(`/api/admin/topup/${id}/${action}`, { method: "POST" });
    showToast(action === "approve" ? "Topup disetujui." : "Topup ditolak.", "success");
    loadPendingTopups();
    loadOverview();
    loadUsers();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadUsers() {
  const { users } = await API.request("/api/admin/users");
  const body = document.getElementById("usersBody");
  if (users.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="text-muted">Belum ada pengguna.</td></tr>`;
    return;
  }
  body.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${formatRupiah(u.balance)}</td>
      <td>${u.devices}</td>
      <td>${formatDate(u.createdAt)}</td>
    </tr>`
    )
    .join("");
}

async function loadSettings() {
  const { settings } = await API.request("/api/admin/settings");
  const t = document.getElementById("badgeTelegram");
  const p = document.getElementById("badgePremku");
  t.textContent = settings.telegramConfigured ? "Terhubung" : "Belum dikonfigurasi";
  t.className = "badge " + (settings.telegramConfigured ? "badge-success" : "badge-pending");
  p.textContent = settings.premkuConfigured ? "Terhubung" : "Belum dikonfigurasi";
  p.className = "badge " + (settings.premkuConfigured ? "badge-success" : "badge-pending");
}

document.getElementById("btnLogout").addEventListener("click", () => {
  API.clearSession();
  location.href = "index.html";
});

loadHeader();
loadOverview();
loadPendingTopups();
loadUsers();
loadSettings();
