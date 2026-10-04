const express = require("express");
const crypto = require("crypto");
const { URL } = require("url");
const db = require("../config/db");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const canManageWebsite = async (user, websiteId) => {
  if (user.role === "SUPER_ADMIN") return true;
  const [rows] = await db.execute(
    "SELECT 1 FROM website_memberships WHERE website_id = ? AND user_id = ? AND role = 'SITE_ADMIN' LIMIT 1",
    [websiteId, user.sub]
  );
  return rows.length > 0;
};

const canViewWebsite = async (user, websiteId) => {
  if (user.role === "SUPER_ADMIN") return true;
  const [rows] = await db.execute(
    "SELECT 1 FROM website_memberships WHERE website_id = ? AND user_id = ? LIMIT 1",
    [websiteId, user.sub]
  );
  return rows.length > 0;
};

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const query = req.user.role === "SUPER_ADMIN"
      ? "SELECT id, name, base_url, authorization_confirmed, status, created_at FROM monitored_websites ORDER BY name"
      : "SELECT w.id, w.name, w.base_url, w.authorization_confirmed, w.status, m.role FROM monitored_websites w JOIN website_memberships m ON m.website_id = w.id WHERE m.user_id = ? ORDER BY w.name";
    const [rows] = await db.execute(query, req.user.role === "SUPER_ADMIN" ? [] : [req.user.sub]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Website list error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load websites" });
  }
});

router.post("/", requireRoles("SUPER_ADMIN"), async (req, res) => {
  const { name, base_url: baseUrl, authorization_confirmed: confirmed } = req.body || {};
  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return res.status(400).json({ success: false, message: "A valid website URL is required" });
  }

  if (!name || !["http:", "https:"].includes(parsedUrl.protocol) || confirmed !== true) {
    return res.status(400).json({ success: false, message: "Name, HTTP(S) URL, and authorization confirmation are required" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO monitored_websites (name, base_url, authorization_confirmed, created_by) VALUES (?, ?, 1, ?)",
      [name.trim(), parsedUrl.toString(), req.user.sub]
    );
    return res.status(201).json({ success: true, website_id: result.insertId });
  } catch (error) {
    console.error("Website create error:", error.message);
    return res.status(500).json({ success: false, message: "Could not create website" });
  }
});

router.post("/:websiteId/members", async (req, res) => {
  const websiteId = Number(req.params.websiteId);
  const userId = Number(req.body?.user_id);
  const role = req.body?.role;

  if (!Number.isSafeInteger(websiteId) || !Number.isSafeInteger(userId) ||
      !["SITE_ADMIN", "ANALYST", "CLIENT"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid membership" });
  }

  try {
    if (!(await canManageWebsite(req.user, websiteId)) ||
        (req.user.role !== "SUPER_ADMIN" && role === "SITE_ADMIN")) {
      return res.status(403).json({ success: false, message: "Website management access denied" });
    }

    await db.execute(
      "INSERT INTO website_memberships (website_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
      [websiteId, userId, role]
    );
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Membership error:", error.message);
    return res.status(500).json({ success: false, message: "Could not assign user" });
  }
});

router.post("/:websiteId/tokens", async (req, res) => {
  const websiteId = Number(req.params.websiteId);
  const label = String(req.body?.label || "website-agent").trim();

  if (!Number.isSafeInteger(websiteId) || !label || label.length > 120) {
    return res.status(400).json({ success: false, message: "Invalid token request" });
  }

  try {
    if (!(await canManageWebsite(req.user, websiteId))) {
      return res.status(403).json({ success: false, message: "Website management access denied" });
    }

    const token = "wsi_" + crypto.randomBytes(32).toString("hex");
    await db.execute(
      "INSERT INTO website_ingest_tokens (website_id, label, token_hash, token_last4) VALUES (?, ?, ?, ?)",
      [websiteId, label, hashToken(token), token.slice(-4)]
    );

    return res.status(201).json({ success: true, token, warning: "Store this token now. It will not be shown again." });
  } catch (error) {
    console.error("Token creation error:", error.message);
    return res.status(500).json({ success: false, message: "Could not create ingest token" });
  }
});

router.get("/:websiteId/summary", async (req, res) => {
  const websiteId = Number(req.params.websiteId);

  try {
    if (!Number.isSafeInteger(websiteId) || !(await canViewWebsite(req.user, websiteId))) {
      return res.status(403).json({ success: false, message: "Website access denied" });
    }

    const [predictions] = await db.execute(
      "SELECT COUNT(*) total_predictions, SUM(attack_name = 'BENIGN') benign_predictions, SUM(attack_name <> 'BENIGN') attack_predictions FROM prediction_logs WHERE website_id = ?",
      [websiteId]
    );
    const [alerts] = await db.execute(
      "SELECT id, alert_type, severity, title, details, status, last_seen_at FROM security_alerts WHERE website_id = ? ORDER BY last_seen_at DESC LIMIT 50",
      [websiteId]
    );

    return res.json({ success: true, data: { predictions: predictions[0], alerts } });
  } catch (error) {
    console.error("Website summary error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load website summary" });
  }
});

module.exports = { router, hashToken };