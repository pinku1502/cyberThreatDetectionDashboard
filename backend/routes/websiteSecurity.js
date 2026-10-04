const express = require("express");
const crypto = require("crypto");
const net = require("net");
const db = require("../config/db");
const { recordApiRequest, recordLoginOutcome } = require("../services/websiteSecurityService");

const router = express.Router();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const authorizeIngest = async (req, res, next) => {
  const supplied = req.get("x-website-security-token") || "";
  if (!supplied) return res.status(403).json({ success: false, message: "Website ingest token required" });

  try {
    const [rows] = await db.execute(
      "SELECT t.website_id FROM website_ingest_tokens t JOIN monitored_websites w ON w.id = t.website_id WHERE t.token_hash = ? AND t.revoked_at IS NULL AND w.status = 'ACTIVE' LIMIT 1",
      [hashToken(supplied)]
    );
    if (rows.length !== 1) return res.status(403).json({ success: false, message: "Unauthorized" });
    req.websiteId = rows[0].website_id;
    await db.execute("UPDATE website_ingest_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = ?", [hashToken(supplied)]);
    return next();
  } catch (error) {
    console.error("Website ingest authorization error:", error.message);
    return res.status(500).json({ success: false, message: "Could not authorize website ingest" });
  }
};

router.use(authorizeIngest);

router.post("/api-request", async (req, res) => {
  const { client_ip: clientIp, endpoint, http_method: httpMethod, http_status_code: rawStatusCode, occurred_at: occurredAt } = req.body || {};
  const statusCode = Number(rawStatusCode);
  if ((clientIp !== null && clientIp !== undefined && (typeof clientIp !== "string" || net.isIP(clientIp) === 0)) ||
      typeof endpoint !== "string" || !endpoint.startsWith("/api/") || endpoint.includes("?") || endpoint.includes("#") || endpoint.length > 255 ||
      typeof httpMethod !== "string" || !/^[A-Z]{1,10}$/.test(httpMethod) || typeof occurredAt !== "string" || Number.isNaN(Date.parse(occurredAt)) ||
      !Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    return res.status(400).json({ success: false, message: "Invalid API request event" });
  }
  try {
    const event = await recordApiRequest({ websiteId: req.websiteId, clientIp: clientIp || null, endpoint, httpMethod, statusCode, occurredAt });
    return res.status(201).json({ success: true, id: event.id, website_id: req.websiteId });
  } catch (error) {
    console.error("API request event error:", error.message);
    return res.status(500).json({ success: false, message: "Could not record API request" });
  }
});

router.post("/login-attempt", async (req, res) => {
  const { client_ip, user_email, endpoint, http_method } = req.body || {};
  if ((client_ip && (typeof client_ip !== "string" || net.isIP(client_ip) === 0)) ||
      typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 255 ||
      typeof http_method !== "string" || !/^[A-Z]{1,10}$/.test(http_method)) {
    return res.status(400).json({ success: false, message: "Invalid login event" });
  }
  try {
    const [result] = await db.execute(
      "INSERT INTO website_security_events (website_id, event_type, client_ip, user_email, endpoint, http_method) VALUES (?, 'LOGIN_ATTEMPT', ?, ?, ?, ?)",
      [req.websiteId, client_ip || null, user_email || null, endpoint, http_method]
    );
    return res.status(201).json({ success: true, id: result.insertId, website_id: req.websiteId });
  } catch (error) {
    console.error("Website security event error:", error.message);
    return res.status(500).json({ success: false, message: "Could not record login attempt" });
  }
});

router.post("/login-attempt/:id/outcome", async (req, res) => {
  const eventType = req.body?.event_type;
  const statusCode = Number(req.body?.http_status_code);
  const attemptId = Number(req.params.id);
  if (!Number.isSafeInteger(attemptId) || attemptId < 1 || !["LOGIN_SUCCESS", "LOGIN_FAILED"].includes(eventType) ||
      !Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599 ||
      (eventType === "LOGIN_SUCCESS" && statusCode !== 200) || (eventType === "LOGIN_FAILED" && statusCode === 200)) {
    return res.status(400).json({ success: false, message: "Invalid login outcome" });
  }
  try {
    const [ownership] = await db.execute("SELECT 1 FROM website_security_events WHERE id = ? AND website_id = ? LIMIT 1", [attemptId, req.websiteId]);
    if (ownership.length !== 1) return res.status(404).json({ success: false, message: "Login attempt not found" });
    const recorded = await recordLoginOutcome(attemptId, eventType, statusCode, req.websiteId);
    if (!recorded) return res.status(404).json({ success: false, message: "Login attempt not found" });
    return res.json({ success: true });
  } catch (error) {
    console.error("Website security outcome error:", error.message);
    return res.status(500).json({ success: false, message: "Could not record login outcome" });
  }
});

module.exports = router;
