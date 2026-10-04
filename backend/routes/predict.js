const express = require("express");
const axios = require("axios");
const db = require("../config/db");
const { getAttackSample } = require("../services/attackSamples");
const { requireAuth } = require("../middleware/auth");
const { requireWebsiteAccess } = require("../middleware/websiteAccess");

const router = express.Router();

const getSeverity = (attack) => {
  if (!attack || attack === "BENIGN") return "Low";
  if (["DDoS", "Heartbleed"].includes(attack)) return "Critical";
  if (["DoS Hulk", "DoS GoldenEye", "DoS Slowloris", "DoS slowloris", "DoS Slowhttptest", "PortScan", "Bot"].includes(attack)) return "High";
  if (["FTP-Patator", "SSH-Patator", "Infiltration", "Web Attack Brute Force", "Web Attack SQL Injection", "Web Attack XSS", "Web Attack ï¿½ Brute Force", "Web Attack ï¿½ Sql Injection", "Web Attack ï¿½ XSS"].includes(attack)) return "Medium";
  return "Low";
};

router.get("/test", (req, res) => res.json({ success: true, message: "Prediction Route Working Successfully" }));

router.get("/sample", async (req, res) => {
  try {
    const attack = String(req.query.attack || "").trim();
    if (!attack) return res.status(400).json({ success: false, message: "Attack type is required" });
    const sample = await getAttackSample(attack);
    if (!sample) return res.status(404).json({ success: false, message: "No labeled sample found for this attack type" });
    return res.json({ success: true, data: sample });
  } catch (error) {
    console.error("Attack sample error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load attack simulation sample" });
  }
});

const { getSelfWebsiteId } = require("../services/monitoredWebsiteSync");

const allowLocalOrAuth = (req, res, next) => {
  const header = req.get("authorization") || "";
  if (header.startsWith("Bearer ")) {
    return requireAuth(req, res, () => {
      requireWebsiteAccess(req, res, next);
    });
  }
  const remoteIp = req.socket.remoteAddress || "";
  const isLocal = remoteIp.includes("127.0.0.1") || remoteIp === "::1" || remoteIp === "::ffff:127.0.0.1";
  if (isLocal) {
    req.websiteId = getSelfWebsiteId();
    return next();
  }
  return requireAuth(req, res, next);
};

router.post("/", allowLocalOrAuth, async (req, res) => {
  try {
    const inputData = { ...(req.body || {}) };
    delete inputData.website_id;
    if (Object.keys(inputData).length === 0) return res.status(400).json({ success: false, message: "Prediction input data is required" });
    const flaskResponse = await axios.post("http://127.0.0.1:8000/predict", inputData, { timeout: 30000 });
    const prediction = flaskResponse.data;
    const attackName = prediction.attack_name || "UNKNOWN";
    const predictionValue = prediction.prediction !== undefined ? Number(prediction.prediction) : 0;
    const confidence = prediction.confidence !== undefined ? Number(prediction.confidence) : 0;
    const severity = getSeverity(attackName);
    let clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
    if (typeof clientIP === "string" && clientIP.includes(",")) clientIP = clientIP.split(",")[0].trim();
    const destinationPort = inputData["Destination Port"] || inputData.destination_port || 443;
    const [result] = await db.query("INSERT INTO prediction_logs (website_id, attack_name, prediction, confidence, client_ip, destination_port, severity) VALUES (?, ?, ?, ?, ?, ?, ?)", [req.websiteId, attackName, predictionValue, confidence, clientIP, destinationPort, severity]);
    return res.json({ success: true, data: { id: result.insertId, website_id: req.websiteId, attack_name: attackName, prediction: predictionValue, confidence, severity, client_ip: clientIP, destination_port: destinationPort, model_used: prediction.model_used || "Hybrid" } });
  } catch (error) {
    console.error("Prediction Error:", error.message);
    if (error.response) return res.status(500).json({ success: false, message: "Flask ML API Error", error: error.response.data || error.message });
    if (error.code === "ECONNREFUSED") return res.status(503).json({ success: false, message: "Flask ML API is not running on port 8000" });
    if (error.code === "ECONNABORTED") return res.status(504).json({ success: false, message: "Flask ML API request timed out" });
    return res.status(500).json({ success: false, message: "Prediction Failed", error: error.message });
  }
});

router.use(requireAuth, requireWebsiteAccess);

router.get("/stats", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) total_predictions, SUM(attack_name = 'BENIGN') benign_predictions, SUM(attack_name <> 'BENIGN') attack_predictions, COUNT(DISTINCT client_ip) unique_ips FROM prediction_logs WHERE website_id = ?",
      [req.websiteId]
    );
    const [attackRows] = await db.query(
      "SELECT DISTINCT attack_name FROM prediction_logs WHERE website_id = ? AND attack_name <> 'BENIGN'",
      [req.websiteId]
    );
    const total = Number(rows[0].total_predictions || 0);
    const benign = Number(rows[0].benign_predictions || 0);
    const attacks = Number(rows[0].attack_predictions || 0);
    const uniqueIps = Number(rows[0].unique_ips || 0) || (total > 0 ? 1 : 0);

    return res.json({
      success: true,
      data: {
        total_predictions: total,
        benign_predictions: benign,
        attack_predictions: attacks,
        attack_types: attackRows.length,
        unique_ips: uniqueIps,
      },
    });
  } catch (error) {
    console.error("Stats Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch prediction statistics" });
  }
});

router.get("/chart", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT attack_name, COUNT(*) count FROM prediction_logs WHERE website_id = ? GROUP BY attack_name ORDER BY count DESC", [req.websiteId]);
    return res.json({ success: true, data: rows.map((row) => ({ attack_name: row.attack_name, count: Number(row.count) })) });
  } catch (error) {
    console.error("Chart Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch chart data" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, website_id, attack_name, prediction, confidence, client_ip, destination_port, severity, created_at FROM prediction_logs WHERE website_id = ? ORDER BY id DESC LIMIT 100", [req.websiteId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("History Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch prediction history" });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, website_id, attack_name, prediction, confidence, client_ip, destination_port, severity, created_at FROM prediction_logs WHERE website_id = ? AND attack_name <> 'BENIGN' ORDER BY id DESC LIMIT 20", [req.websiteId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Alerts Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});

router.get("/attacker-ips", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT client_ip,
              COUNT(*) AS attack_count,
              GROUP_CONCAT(DISTINCT attack_name ORDER BY attack_name SEPARATOR ', ') AS attack_types,
              MAX(severity) AS severity,
              MAX(created_at) AS last_seen,
              destination_port
       FROM prediction_logs
       WHERE website_id = ? AND attack_name <> 'BENIGN'
       GROUP BY client_ip, destination_port
       ORDER BY attack_count DESC, last_seen DESC
       LIMIT 50`,
      [req.websiteId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Attacker IPs Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch attacker IPs" });
  }
});

module.exports = router;
