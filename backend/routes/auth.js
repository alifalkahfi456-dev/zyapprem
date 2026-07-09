const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { readJSON, writeJSON } = require("../utils/store");
const config = require("../config.json");
const telegram = require("../utils/telegram");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.app.jwtSecret,
    { expiresIn: config.app.jwtExpiresIn }
  );
}

function ensureSeedAdmin(db) {
  const hasAdmin = db.users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    const hashed = bcrypt.hashSync(config.admin.seedPassword, 10);
    db.users.push({
      id: uuidv4(),
      email: config.admin.seedEmail,
      password: hashed,
      name: "Administrator",
      role: "admin",
      createdAt: new Date().toISOString(),
    });
  }
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Nama, email, dan password wajib diisi." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password minimal 6 karakter." });
  }

  const db = readJSON("database.json", { users: [], transactions: [], orders: [], sessions: [] });
  ensureSeedAdmin(db);

  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ success: false, message: "Email sudah terdaftar, silakan login." });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    name,
    email,
    password: hashed,
    role: "user",
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  await writeJSON("database.json", db);

  const saldo = readJSON("saldo.json", { balances: {} });
  saldo.balances[newUser.id] = { balance: 0, devices: [] };
  await writeJSON("saldo.json", saldo);

  telegram.events.newRegister(newUser);

  const token = signToken(newUser);
  res.status(201).json({
    success: true,
    message: "Registrasi berhasil.",
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email dan password wajib diisi." });
  }

  const db = readJSON("database.json", { users: [], transactions: [], orders: [], sessions: [] });
  ensureSeedAdmin(db);
  await writeJSON("database.json", db);

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, message: "Email atau password salah." });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false, message: "Email atau password salah." });
  }

  const saldo = readJSON("saldo.json", { balances: {} });
  if (!saldo.balances[user.id]) {
    saldo.balances[user.id] = { balance: 0, devices: [] };
  }
  const device = deviceId || uuidv4();
  if (!saldo.balances[user.id].devices.includes(device)) {
    saldo.balances[user.id].devices.push(device);
  }
  await writeJSON("saldo.json", saldo);

  telegram.events.newLogin(user, device, req.ip);

  const token = signToken(user);
  res.json({
    success: true,
    message: "Login berhasil.",
    token,
    deviceId: device,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

module.exports = router;
