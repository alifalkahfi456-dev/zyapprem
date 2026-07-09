requireLogin();

function badgeFor(status) {
  const map = {
    pending: ["Menunggu", "badge-pending"],
    approved: ["Disetujui", "badge-approved"],
    rejected: ["Ditolak", "badge-rejected"],
    success: ["Berhasil", "badge-success"],
  };
  const [label, cls] = map[status] || [status, "badge-pending"];
  return `<span class="badge ${cls}">${label}</span>`;
}

async function loadDashboard() {
  try {
    const { user } = await API.request("/api/user/me");
    const localUser = API.getUser();

    document.getElementById("avatarInitials").textContent = initials(user.name);
    document.getElementById("chipName").textContent = user.name;
    document.getElementById("greeting").textContent = `Halo, ${user.name.split(" ")[0]}`;
    document.getElementById("balanceAmount").textContent = formatRupiah(user.balance);
    document.getElementById("statDevices").textContent = user.devices;
    document.getElementById("statJoined").textContent = formatDate(user.createdAt);

    if (localUser?.role === "admin" || user.role === "admin") {
      document.getElementById("navAdmin").classList.remove("hidden");
      document.getElementById("navAdmin").href = "admin.html";
    }

    const { transactions } = await API.request("/api/user/transactions");
    document.getElementById("statTrxCount").textContent = transactions.length;

    const body = document.getElementById("trxBody");
    if (transactions.length === 0) {
      body.innerHTML = `<tr><td colspan="4" class="text-muted">Belum ada transaksi.</td></tr>`;
    } else {
      body.innerHTML = transactions
        .slice(0, 8)
        .map(
          (t) => `
        <tr>
          <td>${formatDate(t.createdAt)}</td>
          <td style="text-transform:capitalize;">${t.type}</td>
          <td class="text-mono">${formatRupiah(t.amount)}</td>
          <td>${badgeFor(t.status)}</td>
        </tr>`
        )
        .join("");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.getElementById("btnLogout").addEventListener("click", () => {
  API.clearSession();
  location.href = "index.html";
});

loadDashboard();
