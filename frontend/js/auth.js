redirectIfLoggedIn();

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const formLogin = document.getElementById("formLogin");
const formRegister = document.getElementById("formRegister");

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  formLogin.classList.remove("hidden");
  formRegister.classList.add("hidden");
});
tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  formRegister.classList.remove("hidden");
  formLogin.classList.add("hidden");
});

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnLogin");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  btn.disabled = true;
  btn.querySelector("span").textContent = "Memproses...";
  try {
    const data = await API.request("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password, deviceId: API.getDeviceId() },
    });
    API.setSession(data);
    showToast("Login berhasil, mengalihkan...", "success");
    setTimeout(() => {
      location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
    }, 500);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Masuk";
  }
});

formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnRegister");
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  btn.disabled = true;
  btn.querySelector("span").textContent = "Membuat akun...";
  try {
    const data = await API.request("/api/auth/register", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    });
    API.setSession(data);
    showToast("Akun berhasil dibuat!", "success");
    setTimeout(() => (location.href = "dashboard.html"), 500);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Buat akun";
  }
});
