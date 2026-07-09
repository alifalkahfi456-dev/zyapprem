requireLogin();

function badgeFor(status) {
  const map = {
    pending:  ["Menunggu Bayar", "badge-pending"],
    approved: ["Berhasil",       "badge-approved"],
    rejected: ["Dibatalkan",     "badge-rejected"],
  };
  const [label, cls] = map[status] || [status, "badge-pending"];
  return `<span class="badge ${cls}">${label}</span>`;
}

async function loadHeader() {
  const { user } = await API.request("/api/user/me");
  document.getElementById("avatarInitials").textContent = initials(user.name);
  document.getElementById("chipName").textContent = user.name;
  if (user.role === "admin") {
    document.getElementById("navAdmin").classList.remove("hidden");
    document.getElementById("navAdmin").href = "admin.html";
  }
}

async function loadHistory() {
  const { transactions } = await API.request("/api/user/transactions");
  const topups = transactions.filter((t) => t.type === "topup");
  const body = document.getElementById("topupBody");
  if (topups.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="text-muted">Belum ada riwayat topup.</td></tr>`;
    return;
  }
  body.innerHTML = topups
    .map((t) => `
    <tr>
      <td>${formatDate(t.createdAt)}</td>
      <td class="text-mono">${formatRupiah(t.amount)}</td>
      <td>QRIS Otomatis</td>
      <td>${badgeFor(t.status)}</td>
    </tr>`).join("");
}

document.querySelectorAll(".quick-amount").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("topupAmount").value = btn.dataset.amount;
  });
});

let activePoll = null;

function showQrisModal(qrisData, trxId, amount) {
  const modal    = document.getElementById("qrisModal");
  const img      = document.getElementById("qrisImage");
  const amountEl = document.getElementById("qrisAmount");
  const statusEl = document.getElementById("qrisStatus");
  const cancelBtn = document.getElementById("btnCancelDeposit");

  // premku return qr_raw (string QRIS) → generate image via qrserver
  const qrRaw  = qrisData.qr_raw  || qrisData.qr_string || null;
  const qrUrl  = qrisData.qr_url  || qrisData.qr_image_url || null;
  const invoice = qrisData.invoice || null;

  if (qrUrl) {
    img.src = qrUrl;
    img.style.display = "block";
  } else if (qrRaw) {
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrRaw)}`;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }

  amountEl.textContent = formatRupiah(amount);
  statusEl.textContent = "Menunggu pembayaran...";
  statusEl.className   = "qris-status pending";
  cancelBtn.style.display = "inline-block";
  modal.classList.add("active");

  // Cancel handler
  cancelBtn.onclick = async () => {
    cancelBtn.disabled = true;
    cancelBtn.textContent = "Membatalkan...";
    try {
      await API.request("/api/topup/cancel", { method: "POST", body: { trxId } });
      stopPoll();
      statusEl.textContent = "Deposit dibatalkan.";
      statusEl.className   = "qris-status timeout";
      cancelBtn.style.display = "none";
      loadHistory();
    } catch (err) {
      showToast(err.message, "error");
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Batalkan";
    }
  };

  // Polling status tiap 5 detik ke backend kita, backend tanya premku /api/pay_status
  let attempts = 0;
  activePoll = setInterval(async () => {
    attempts++;
    try {
      const res = await API.request("/api/topup/status", {
        method: "POST",
        body: { trxId, invoice },
      });
      if (res.status === "approved") {
        stopPoll();
        statusEl.textContent = "✅ Pembayaran berhasil! Saldo sudah masuk.";
        statusEl.className   = "qris-status success";
        cancelBtn.style.display = "none";
        setTimeout(() => { closeQrisModal(); loadHistory(); }, 2500);
      }
    } catch (_) {}
    if (attempts >= 24) { // 2 menit
      stopPoll();
      statusEl.textContent = "⏱ Timeout. Saldo masuk otomatis setelah premku konfirmasi.";
      statusEl.className   = "qris-status timeout";
      cancelBtn.style.display = "none";
    }
  }, 5000);
}

function stopPoll() {
  if (activePoll) { clearInterval(activePoll); activePoll = null; }
}

function closeQrisModal() {
  stopPoll();
  document.getElementById("qrisModal").classList.remove("active");
}

document.getElementById("btnCloseQris").addEventListener("click", closeQrisModal);
document.getElementById("qrisModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeQrisModal();
});

document.getElementById("btnTopup").addEventListener("click", async () => {
  const btn    = document.getElementById("btnTopup");
  const amount = Number(document.getElementById("topupAmount").value);

  if (!amount || amount < 10000) {
    showToast("Minimal topup Rp10.000", "error");
    return;
  }

  btn.disabled = true;
  btn.querySelector("span").textContent = "Membuat deposit...";
  try {
    const data = await API.request("/api/topup/request", {
      method: "POST",
      body: { amount },
    });
    document.getElementById("topupAmount").value = "";
    showQrisModal(data.qris, data.transaction.id, amount);
    loadHistory();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Bayar dengan QRIS";
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  API.clearSession();
  location.href = "index.html";
});

loadHeader();
loadHistory();
