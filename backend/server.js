const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Load .env robustly regardless of working directory
const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
require("dotenv").config({ path: envPath });

const { syncMonitoredWebsites, getSelfWebsiteId } = require("./services/monitoredWebsiteSync");
const { selfThreatMonitor, logDetectedThreat } = require("./middleware/selfThreatMonitor");

const predictRoutes = require("./routes/predict");
const websiteSecurityRoutes = require("./routes/websiteSecurity");
const authRoutes = require("./routes/auth");
const websiteRoutes = require("./routes/websites").router;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Self-threat monitoring middleware active for all incoming traffic to this website
app.use(selfThreatMonitor);

app.use((req, res, next) => {
  console.log(req.method + " " + req.originalUrl);
  next();
});

// Self-monitoring status endpoint
app.get("/api/self-monitoring/status", (req, res) => {
  const selfWebsiteId = getSelfWebsiteId();
  res.json({
    success: true,
    self_monitoring_active: true,
    website_id: selfWebsiteId,
    mode: "Internal Platform Cyber Threat Sentinel",
    monitored_vectors: [
      "SQL Injection (Web Attack SQL Injection)",
      "Cross-Site Scripting (Web Attack XSS)",
      "Directory Traversal & Infiltration",
      "Brute Force Login Attacks",
      "DoS Flooding & High-Rate Traffic",
      "Automated Vulnerability Scanners / Bots",
      "Benign Network & HTTP Traffic Telemetry",
    ],
  });
});

// Safe test endpoint to trigger a cyber threat detection on this website
app.post("/api/self-monitoring/simulate", async (req, res) => {
  const { attack_name = "Web Attack SQL Injection" } = req.body || {};
  const selfWebsiteId = getSelfWebsiteId();
  if (!selfWebsiteId) {
    return res.status(500).json({ success: false, message: "Self-monitored website not initialized" });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  await logDetectedThreat({
    websiteId: selfWebsiteId,
    attackName: attack_name,
    severity: attack_name.includes("DDoS") || attack_name.includes("Infiltration") ? "Critical" : "High",
    clientIp: String(clientIp).replace(/^.*:/, ""),
    destinationPort: req.socket.localPort || Number(process.env.PORT) || 5000,
    endpoint: "/api/self-monitoring/test-vector",
    method: "POST",
    details: { reason: "Self-threat detection test executed", testVector: attack_name },
  });

  return res.json({
    success: true,
    message: `Self-monitoring threat detected and logged: ${attack_name}`,
    website_id: selfWebsiteId,
    attack_name,
  });
});

app.use("/api/predict", predictRoutes);
app.use("/api/website-security", websiteSecurityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/websites", websiteRoutes);
app.get("/", (req, res) => res.json({ message: "Cyber Threat Detection Platform Backend Running" }));

const PORT = process.env.PORT || 5000;

// Initialize developer-configured websites and start server
syncMonitoredWebsites()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
      console.log("Self-monitoring initialized for this platform (Self ID: " + getSelfWebsiteId() + ")");
    });
  })
  .catch((err) => {
    console.error("Initialization error:", err);
    app.listen(PORT, () => console.log("Server running on port " + PORT));
  });
