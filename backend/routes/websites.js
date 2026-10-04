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
  return true; // All developer-configured monitored websites are visible to logged-in users
};

// Real-time telemetry ingest endpoint for monitored websites (e.g. NexaoraNotes)
router.post("/ingest-event", async (req, res) => {
  const {
    website_code,
    website_id: rawWebsiteId,
    attack_name = "BENIGN",
    prediction = 0,
    confidence = 0.98,
    severity = "Low",
    client_ip,
    clientIp,
    destination_port = 8000,
    endpoint = "/",
    method = "GET",
    details = {},
  } = req.body || {};

  let websiteId = Number(rawWebsiteId);

  try {
    if (!websiteId && website_code) {
      const [rows] = await db.query(
        "SELECT id FROM monitored_websites WHERE code = ? OR name LIKE ? LIMIT 1",
        [website_code, `%${website_code}%`]
      );
      if (rows.length > 0) websiteId = rows[0].id;
    }

    if (!websiteId) {
      return res.status(400).json({ success: false, message: "Valid website_id or website_code required" });
    }

    let cleanIp = String(client_ip || clientIp || "127.0.0.1").trim();
    if (cleanIp.startsWith("::ffff:")) cleanIp = cleanIp.replace(/^::ffff:/, "");
    if (cleanIp === "::1") cleanIp = "127.0.0.1";

    // 1. Insert into prediction_logs
    const [result] = await db.query(
      "INSERT INTO prediction_logs (website_id, attack_name, prediction, confidence, client_ip, destination_port, severity) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [websiteId, attack_name, prediction, confidence, cleanIp, destination_port, severity]
    );

    // 2. If it's an attack, record into security_alerts
    if (attack_name && attack_name !== "BENIGN") {
      await db.query(
        "INSERT INTO security_alerts (website_id, alert_type, severity, title, details, status) VALUES (?, ?, ?, ?, ?, 'OPEN')",
        [
          websiteId,
          attack_name,
          String(severity).toUpperCase(),
          `Intrusion Detected: ${attack_name} on ${endpoint}`,
          JSON.stringify({ endpoint, method, client_ip: cleanIp, log_id: result.insertId, ...details }),
        ]
      );
      console.log(`🚨 [NEXAORANOTES INTRUSION] ${attack_name} from ${cleanIp} on ${method} ${endpoint}`);
    } else {
      console.log(`📡 [NEXAORANOTES TRAFFIC] BENIGN from ${cleanIp} on ${method} ${endpoint}`);
    }

    return res.status(201).json({
      success: true,
      message: "Event logged successfully",
      id: result.insertId,
      website_id: websiteId,
      attack_name,
    });
  } catch (error) {
    console.error("Ingest event error:", error.message);
    return res.status(500).json({ success: false, message: "Could not log event" });
  }
});

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT w.id, w.name, w.base_url, w.is_self, w.code, w.description, w.status " +
      "FROM monitored_websites w " +
      "JOIN website_memberships m ON m.website_id = w.id " +
      "WHERE m.user_id = ? " +
      "ORDER BY w.id ASC",
      [req.user.sub]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Website list error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load websites" });
  }
});

router.post("/", async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Websites cannot be added from the dashboard. Monitored websites are configured by the developer in the code (backend/config/monitoredWebsites.js).",
  });
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