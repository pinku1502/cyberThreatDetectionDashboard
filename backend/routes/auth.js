const express = require("express");
const db = require("../config/db");
const { hashPassword, verifyPassword, signUser } = require("../services/authService");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post("/bootstrap", async (req, res) => {
  const { full_name: fullName, email, password, bootstrap_key: bootstrapKey } = req.body || {};

  if (!process.env.SUPER_ADMIN_BOOTSTRAP_KEY || bootstrapKey !== process.env.SUPER_ADMIN_BOOTSTRAP_KEY) {
    return res.status(403).json({ success: false, message: "Invalid bootstrap key" });
  }

  if (!fullName || !email || !password || password.length < 12) {
    return res.status(400).json({ success: false, message: "Name, email, and a password of at least 12 characters are required" });
  }

  try {
    const [existing] = await db.execute("SELECT id FROM dashboard_users WHERE email = ? LIMIT 1", [email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ success: false, message: "User already exists" });

    const [result] = await db.execute(
      "INSERT INTO dashboard_users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'SUPER_ADMIN')",
      [fullName.trim(), email.trim().toLowerCase(), hashPassword(password)]
    );

    return res.status(201).json({ success: true, user_id: result.insertId, message: "Super admin created" });
  } catch (error) {
    console.error("Bootstrap error:", error.message);
    return res.status(500).json({ success: false, message: "Could not create super admin" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });

  try {
    const [rows] = await db.execute(
      "SELECT id, full_name, email, password_hash, role FROM dashboard_users WHERE email = ? AND status = 'ACTIVE' LIMIT 1",
      [email.trim().toLowerCase()]
    );
    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    return res.json({
      success: true,
      token: signUser(user),
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, full_name, email, role, status FROM dashboard_users WHERE id = ? LIMIT 1",
      [req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: { ...rows[0], name: rows[0].full_name } });
  } catch {
    return res.status(500).json({ success: false, message: "Could not load user" });
  }
});

router.get("/users", requireAuth, requireRoles("SUPER_ADMIN", "SITE_ADMIN"), async (req, res) => {
  try {
    const query = req.user.role === "SUPER_ADMIN" ? "SELECT id, full_name, email, role, status FROM dashboard_users ORDER BY full_name" : "SELECT u.id, u.full_name, u.email, u.role, u.status FROM dashboard_users u JOIN website_memberships m ON m.user_id = u.id JOIN website_memberships own ON own.website_id = m.website_id WHERE own.user_id = ? GROUP BY u.id ORDER BY u.full_name";
    const params = req.user.role === "SUPER_ADMIN" ? [] : [req.user.sub];
    const [rows] = await db.execute(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load users" });
  }
});

router.post("/users", requireAuth, requireRoles("SUPER_ADMIN", "SITE_ADMIN"), async (req, res) => {
  const { full_name: fullName, email, password, role = "CLIENT" } = req.body || {};
  const allowedRoles = ["SITE_ADMIN", "ANALYST", "CLIENT"];

  if (!fullName || !email || !password || password.length < 12 || !allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid user details" });
  }

  if (req.user.role !== "SUPER_ADMIN" && role === "SITE_ADMIN") {
    return res.status(403).json({ success: false, message: "Only super admins can create site admins" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO dashboard_users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [fullName.trim(), email.trim().toLowerCase(), hashPassword(password), role]
    );
    return res.status(201).json({ success: true, user_id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Email already exists" });
    return res.status(500).json({ success: false, message: "Could not create user" });
  }
});

module.exports = router;