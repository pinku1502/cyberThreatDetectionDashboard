const express = require("express");
const crypto = require("crypto");
const net = require("net");
const db = require("../config/db");
const {
  recordApiRequest,
  recordLoginOutcome,
} = require("../services/websiteSecurityService");

const router = express.Router();

const isLoopback = (address) => {
  const normalized = String(address || "").replace(/^::ffff:/, "");
  return normalized === "127.0.0.1" || normalized === "::1";
};

const authorizeIngest = (req, res, next) => {
  const expectedToken = process.env.WEBSITE_SECURITY_INGEST_TOKEN;

  if (expectedToken) {
    const suppliedToken = req.get("x-website-security-token") || "";
    const expected = Buffer.from(expectedToken);
    const supplied = Buffer.from(suppliedToken);

    if (
      expected.length === supplied.length &&
      crypto.timingSafeEqual(expected, supplied)
    ) {
      return next();
    }

    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  if (!isLoopback(req.socket.remoteAddress)) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  next();
};

router.use(authorizeIngest);

router.post("/api-request", async (req, res) => {
  const {
    client_ip: clientIp,
    endpoint,
    http_method: httpMethod,
    http_status_code: rawStatusCode,
    occurred_at: occurredAt,
  } = req.body || {};
  const statusCode = Number(rawStatusCode);

  if (
    (clientIp !== null && clientIp !== undefined &&
      (typeof clientIp !== "string" || net.isIP(clientIp) === 0)) ||
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/api/") ||
    endpoint.includes("?") ||
    endpoint.includes("#") ||
    endpoint.length > 255 ||
    typeof httpMethod !== "string" ||
    !/^[A-Z]{1,10}$/.test(httpMethod) ||
    typeof occurredAt !== "string" ||
    Number.isNaN(Date.parse(occurredAt)) ||
    !Number.isInteger(statusCode) ||
    statusCode < 100 ||
    statusCode > 599
  ) {
    return res.status(400).json({ success: false, message: "Invalid API request event" });
  }

  try {
    const event = await recordApiRequest({
      clientIp: clientIp || null,
      endpoint,
      httpMethod,
      statusCode,
      occurredAt,
    });

    return res.status(201).json({ success: true, id: event.id });
  } catch (error) {
    console.error("API request event error:", error.message);
    return res.status(500).json({ success: false, message: "Could not record API request" });
  }
});

router.post("/login-attempt", async (req, res) => {
  const { client_ip, user_email, endpoint, http_method } = req.body || {};

  if (
    typeof endpoint !== "string" ||
    endpoint.length === 0 ||
    endpoint.length > 255 ||
    typeof http_method !== "string" ||
    http_method.length === 0 ||
    http_method.length > 10
  ) {
    return res.status(400).json({ success: false, message: "Invalid login event" });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO website_security_events
        (event_type, client_ip, user_email, endpoint, http_method)
       VALUES ('LOGIN_ATTEMPT', ?, ?, ?, ?)`,
      [client_ip || null, user_email || null, endpoint, http_method]
    );

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Website security event error:", error.message);
    return res.status(500).json({ success: false, message: "Could not record login attempt" });
  }
});

router.post("/login-attempt/:id/outcome", async (req, res) => {
  const eventType = req.body?.event_type;
  const statusCode = Number(req.body?.http_status_code);
  const attemptId = Number(req.params.id);

  if (
    !Number.isSafeInteger(attemptId) ||
    attemptId < 1 ||
    !["LOGIN_SUCCESS", "LOGIN_FAILED"].includes(eventType) ||
    !Number.isInteger(statusCode) ||
    statusCode < 100 ||
    statusCode > 599 ||
    (eventType === "LOGIN_SUCCESS" && statusCode !== 200) ||
    (eventType === "LOGIN_FAILED" && statusCode === 200)
  ) {
    return res.status(400).json({ success: false, message: "Invalid login outcome" });
  }

  try {
    const recorded = await recordLoginOutcome(attemptId, eventType, statusCode);

    if (!recorded) {
      return res.status(404).json({ success: false, message: "Login attempt not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Website security outcome error:", error.message);
    return res.status(500).json({ success: false, message: "Could not record login outcome" });
  }
});

module.exports = router;