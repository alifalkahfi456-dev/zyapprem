const express = require("express");
const cors = require("cors");
const config = require("./config");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const topupRoutes = require("./routes/topup");
const adminRoutes = require("./routes/admin");
const productsRoutes = require("./routes/products");

const app = express();

app.use(
  cors({
    origin: config.app.corsOrigin === "*" ? true : config.app.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Healthcheck
app.get("/", (req, res) => {
  res.json({ success: true, message: `${config.app.name} API is running.` });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/topup", topupRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan." });
});

// Global error handler — memastikan server tidak crash saat error tak terduga
app.use((err, req, res, next) => {
  console.error("[error]", err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
});

const PORT = process.env.PORT || config.app.port || 5000;
app.listen(PORT, () => {
  console.log(`✔ ${config.app.name} backend berjalan di http://localhost:${PORT}`);
});
