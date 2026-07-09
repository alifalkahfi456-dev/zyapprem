requireLogin();

async function loadProfile() {
  try {
    const { user } = await API.request("/api/user/me");
    document.getElementById("avatarInitials").textContent = initials(user.name);
    document.getElementById("chipName").textContent = user.name;
    document.getElementById("profName").value = user.name;
    document.getElementById("profEmail").value = user.email;
    document.getElementById("deviceInfo").textContent = `${user.devices} perangkat pernah login ke akun ini. Bot monitoring kami mencatat setiap login baru.`;
    if (user.role === "admin") {
      document.getElementById("navAdmin").classList.remove("hidden");
      document.getElementById("navAdmin").href = "admin.html";
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.getElementById("formProfile").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnSaveProfile");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Menyimpan...";
  try {
    await API.request("/api/user/me", {
      method: "PUT",
      body: { name: document.getElementById("profName").value.trim() },
    });
    showToast("Profil berhasil diperbarui.", "success");
    const user = API.getUser();
    user.name = document.getElementById("profName").value.trim();
    localStorage.setItem("ps_user", JSON.stringify(user));
    document.getElementById("chipName").textContent = user.name;
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Simpan perubahan";
  }
});

document.getElementById("formPassword").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnSavePassword");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Menyimpan...";
  try {
    await API.request("/api/user/me", {
      method: "PUT",
      body: {
        currentPassword: document.getElementById("currentPassword").value,
        newPassword: document.getElementById("newPassword").value,
      },
    });
    showToast("Password berhasil diubah.", "success");
    document.getElementById("formPassword").reset();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Ubah password";
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  API.clearSession();
  location.href = "index.html";
});

loadProfile();
