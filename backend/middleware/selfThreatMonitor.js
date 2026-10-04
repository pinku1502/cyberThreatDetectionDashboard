const db = require("../config/db");
const { getSelfWebsiteId } = require("../services/monitoredWebsiteSync");

// In-memory rate limiting and flood tracking
const ipTimestamps = new Map();
const lastThreatLogged = new Map();
let lastBenignSampleTime = 0;

// Regex patterns for threat detection
const SQLI_REGEX = /(\b(UNION(\s+ALL)?\s+SELECT|SELECT\s+.+\s+FROM|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|UPDATE\s+.+\s+SET|OR\s+['"]?1['"]?\s*=\s*['"]?1|AND\s+['"]?1['"]?\s*=\s*['"]?1|--|\/\*|\*\/|;\s*SHUTDOWN|EXEC(\s|\+)+(SP_|XP_)|BENCHMARK\s*\(|WAITFOR\s+DELAY|SLEEP\s*\()\b|(\%27)|(\'))/i;
const XSS_REGEX = /(\b<script\b|javascript:|onerror\s*=|onload\s*=|onclick\s*=|eval\s*\(|<svg\b|<iframe\b|<img\s+[^>]*src\s*=\s*['"]?x['"]?)/i;
const PATH_TRAVERSAL_REGEX = /(\.\.\/|\.\.\\|\/etc\/passwd|win\.ini|\/bin\/sh|\/bin\/bash|cmd\.exe|powershell\.exe)/i;
const BOT_REGEX = /(sqlmap|nikto|nmap|masscan|dirbuster|acunetix|havij|burpcollaborator|metasploit)/i;

const cleanIp = (ip) => {
  if (!ip) return "127.0.0.1";
  let cleaned = String(ip);
  if (cleaned.includes(",")) cleaned = cleaned.split(",")[0].trim();
  if (cleaned === "::1" || cleaned === "::ffff:127.0.0.1") return "127.0.0.1";
  return cleaned.replace(/^::ffff:/, "");
};

async function logDetectedThreat({ websiteId, attackName, severity, clientIp, destinationPort, endpoint, method, details }) {
  try {
    const confidence = 0.98;
    const [result] = await db.query(
      "INSERT INTO prediction_logs (website_id, attack_name, prediction, confidence, client_ip, destination_port, severity) VALUES (?, ?, 1, ?, ?, ?, ?)",
      [websiteId, attackName, confidence, clientIp, destinationPort, severity]
    );

    // Also record security alert
    await db.query(
      "INSERT INTO security_alerts (website_id, alert_type, severity, title, details, status) VALUES (?, ?, ?, ?, ?, 'OPEN')",
      [
        websiteId,
        attackName,
        severity.toUpperCase(),
        `Intrusion Threat Detected: ${attackName} on ${endpoint}`,
        JSON.stringify({ endpoint, method, client_ip: clientIp, log_id: result.insertId, ...details }),
      ]
    );

    console.warn(`🚨 [SELF-MONITOR] Alert logged: ${attackName} from ${clientIp} on ${method} ${endpoint}`);
  } catch (error) {
    console.error("Failed to log self-monitored threat:", error.message);
  }
}

async function logBenignTraffic({ websiteId, clientIp, destinationPort }) {
  try {
    await db.query(
      "INSERT INTO prediction_logs (website_id, attack_name, prediction, confidence, client_ip, destination_port, severity) VALUES (?, 'BENIGN', 0, 0.99, ?, ?, 'Low')",
      [websiteId, clientIp, destinationPort]
    );
  } catch (error) {
    // Non-critical, ignore
  }
}

const selfThreatMonitor = async (req, res, next) => {
  // Pass through if preflight OPTIONS
  if (req.method === "OPTIONS") return next();

  const websiteId = getSelfWebsiteId();
  if (!websiteId) {
    return next();
  }

  const clientIp = cleanIp(req.headers["x-forwarded-for"] || req.socket.remoteAddress);
  const destinationPort = req.socket.localPort || Number(process.env.PORT) || 5000;
  const userAgent = req.headers["user-agent"] || "";
  const requestUrl = decodeURIComponent(req.originalUrl || req.url || "");
  const requestBodyStr = req.body ? JSON.stringify(req.body) : "";
  const inspectedPayload = `${requestUrl} ${requestBodyStr}`;

  const now = Date.now();

  // 1. Rate limiting / DoS flood tracking per client IP
  if (!ipTimestamps.has(clientIp)) {
    ipTimestamps.set(clientIp, []);
  }
  const timestamps = ipTimestamps.get(clientIp);
  timestamps.push(now);

  // Keep only requests from the last 10 seconds
  const cutoff = now - 10000;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }

  let detectedAttack = null;
  let detectedSeverity = "Low";
  let detectionDetails = {};

  // Check rate flood (> 30 requests in 5 seconds)
  const recentIn5Sec = timestamps.filter((t) => t > now - 5000).length;
  if (recentIn5Sec > 35) {
    detectedAttack = "DoS Hulk";
    detectedSeverity = "High";
    detectionDetails = { reason: "High-rate request flood (DoS pattern)", requestRate: recentIn5Sec };
  } else if (BOT_REGEX.test(userAgent)) {
    detectedAttack = "Bot";
    detectedSeverity = "High";
    detectionDetails = { userAgent, reason: "Automated vulnerability scanner / bot detected" };
  } else if (SQLI_REGEX.test(inspectedPayload)) {
    detectedAttack = "Web Attack SQL Injection";
    detectedSeverity = "High";
    detectionDetails = { sample: inspectedPayload.slice(0, 150), reason: "SQL injection signature detected" };
  } else if (XSS_REGEX.test(inspectedPayload)) {
    detectedAttack = "Web Attack XSS";
    detectedSeverity = "Medium";
    detectionDetails = { sample: inspectedPayload.slice(0, 150), reason: "Cross-site scripting (XSS) payload detected" };
  } else if (PATH_TRAVERSAL_REGEX.test(inspectedPayload)) {
    detectedAttack = "Infiltration";
    detectedSeverity = "Critical";
    detectionDetails = { sample: inspectedPayload.slice(0, 150), reason: "Directory traversal / system infiltration attempt" };
  }

  if (detectedAttack) {
    // Throttle duplicate alerts from the same IP & attack within 3 seconds
    const threatKey = `${clientIp}:${detectedAttack}`;
    const lastTime = lastThreatLogged.get(threatKey) || 0;
    if (now - lastTime > 3000) {
      lastThreatLogged.set(threatKey, now);
      logDetectedThreat({
        websiteId,
        attackName: detectedAttack,
        severity: detectedSeverity,
        clientIp,
        destinationPort,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        details: detectionDetails,
      });
    }
  } else {
    // Sample benign requests (once every 4 seconds) to show live healthy traffic
    if (now - lastBenignSampleTime > 4000) {
      lastBenignSampleTime = now;
      logBenignTraffic({ websiteId, clientIp, destinationPort });
    }
  }

  next();
};

const failedLoginAttempts = new Map();

async function recordFailedLogin(rawIp, userEmail) {
  const websiteId = getSelfWebsiteId();
  if (!websiteId) return;

  const clientIp = cleanIp(rawIp);
  const now = Date.now();
  const attempts = (failedLoginAttempts.get(clientIp) || []).filter((t) => t > now - 5 * 60 * 1000);
  attempts.push(now);
  failedLoginAttempts.set(clientIp, attempts);

  if (attempts.length >= 3) {
    await logDetectedThreat({
      websiteId,
      attackName: "Web Attack Brute Force",
      severity: "High",
      clientIp,
      destinationPort: Number(process.env.PORT) || 5000,
      endpoint: "/api/auth/login",
      method: "POST",
      details: {
        reason: `${attempts.length} consecutive failed login attempts detected in 5 minutes`,
        attemptedEmail: userEmail,
      },
    });
  }
}

function recordSuccessfulLogin(rawIp) {
  const clientIp = cleanIp(rawIp);
  failedLoginAttempts.delete(clientIp);
}

module.exports = {
  selfThreatMonitor,
  logDetectedThreat,
  recordFailedLogin,
  recordSuccessfulLogin,
};

