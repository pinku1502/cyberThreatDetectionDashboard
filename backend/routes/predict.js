const express = require("express");
const axios = require("axios");

const router = express.Router();
const db = require("../config/db");
const { getAttackSample } = require("../services/attackSamples");

/* =========================================================
   SEVERITY MAPPING
   ========================================================= */

const getSeverity = (attack) => {
  if (!attack || attack === "BENIGN") {
    return "Low";
  }

  if (["DDoS", "Heartbleed"].includes(attack)) {
    return "Critical";
  }

  if (
    [
      "DoS Hulk",
      "DoS GoldenEye",
      "DoS Slowloris",
      "DoS slowloris",
      "DoS Slowhttptest",
      "PortScan",
      "Bot",
    ].includes(attack)
  ) {
    return "High";
  }

  if (
    [
      "FTP-Patator",
      "SSH-Patator",
      "Infiltration",
      "Web Attack Brute Force",
      "Web Attack SQL Injection",
      "Web Attack XSS",
      "Web Attack � Brute Force",
      "Web Attack � Sql Injection",
      "Web Attack � XSS",
    ].includes(attack)
  ) {
    return "Medium";
  }

  return "Low";
};

/* =========================================================
   TEST ROUTE
   GET /api/predict/test
   ========================================================= */

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Prediction Route Working Successfully",
  });
});


// GET /api/predict/sample?attack=DDoS
router.get("/sample", async (req, res) => {
  try {
    const attack = String(req.query.attack || "").trim();

    if (!attack) {
      return res.status(400).json({
        success: false,
        message: "Attack type is required",
      });
    }

    const sample = await getAttackSample(attack);

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "No labeled sample found for this attack type",
      });
    }

    return res.json({
      success: true,
      data: sample,
    });
  } catch (error) {
    console.error("Attack sample error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load attack simulation sample",
    });
  }
});
/* =========================================================
   PREDICTION ROUTE
   POST /api/predict
   ========================================================= */

router.post("/", async (req, res) => {
  try {
    const inputData = req.body;

    if (!inputData || Object.keys(inputData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Prediction input data is required",
      });
    }

    /* -----------------------------------------------------
       Call Flask ML API
       ----------------------------------------------------- */

    const flaskResponse = await axios.post(
      "http://127.0.0.1:8000/predict",
      inputData,
      {
        timeout: 30000,
      }
    );

    const prediction = flaskResponse.data;

    /* -----------------------------------------------------
       Prediction Details
       ----------------------------------------------------- */

    const attackName = prediction.attack_name || "UNKNOWN";

    const predictionValue =
      prediction.prediction !== undefined
        ? Number(prediction.prediction)
        : 0;

    const confidence =
      prediction.confidence !== undefined
        ? Number(prediction.confidence)
        : 0;

    const severity = getSeverity(attackName);

    /* -----------------------------------------------------
       Client IP
       ----------------------------------------------------- */

    let clientIP =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.connection?.remoteAddress ||
      "Unknown";

    if (typeof clientIP === "string" && clientIP.includes(",")) {
      clientIP = clientIP.split(",")[0].trim();
    }

    /* -----------------------------------------------------
       Destination Port
       ----------------------------------------------------- */

    const destinationPort =
      inputData["Destination Port"] ||
      inputData.destination_port ||
      443;

    /* -----------------------------------------------------
       Save Prediction
       ----------------------------------------------------- */

    const sql = `
      INSERT INTO prediction_logs
      (
        attack_name,
        prediction,
        confidence,
        client_ip,
        destination_port,
        severity
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      attackName,
      predictionValue,
      confidence,
      clientIP,
      destinationPort,
      severity,
    ];

    const [result] = await db.query(sql, values);

    /* -----------------------------------------------------
       Response
       ----------------------------------------------------- */

    return res.json({
    success: true,
    version: "FINAL-TEST-01",
    data: { id: result.insertId,
        attack_name: attackName,
        prediction: predictionValue,
        confidence: confidence,
        severity: severity,
        client_ip: clientIP,
        destination_port: destinationPort,
        model_used: prediction.model_used || "Hybrid",
      },
    });
  } catch (error) {
    console.error("Prediction Error:", error.message);

    if (error.response) {
      return res.status(500).json({
        success: false,
        message: "Flask ML API Error",
        error: error.response.data || error.message,
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "Flask ML API is not running on port 8000",
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "Flask ML API request timed out",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Prediction Failed",
      error: error.message,
    });
  }
});

/* =========================================================
   STATS ROUTE
   GET /api/predict/stats
   ========================================================= */

router.get("/stats", async (req, res) => {
  try {
    /* -----------------------------------------------------
       Main Statistics
       ----------------------------------------------------- */

    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_predictions,

        SUM(
          CASE
            WHEN attack_name = 'BENIGN'
            THEN 1
            ELSE 0
          END
        ) AS benign_predictions,

        SUM(
          CASE
            WHEN attack_name <> 'BENIGN'
            THEN 1
            ELSE 0
          END
        ) AS attack_predictions

      FROM prediction_logs
    `);

    /* -----------------------------------------------------
       Distinct Attack Types
       Only non-BENIGN attacks are counted
       ----------------------------------------------------- */

    const [attackRows] = await db.query(`
      SELECT DISTINCT attack_name
      FROM prediction_logs
      WHERE attack_name <> 'BENIGN'
    `);

    const attackTypes = attackRows.length;

    return res.json({
      success: true,
      data: {
        total_predictions: Number(
          rows[0].total_predictions || 0
        ),

        benign_predictions: Number(
          rows[0].benign_predictions || 0
        ),

        attack_predictions: Number(
          rows[0].attack_predictions || 0
        ),

        attack_types: attackTypes,
      },
    });
  } catch (error) {
    console.error("Stats Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch prediction statistics",
      error: error.message,
    });
  }
});

/* =========================================================
   CHART ROUTE
   GET /api/predict/chart
   ========================================================= */

router.get("/chart", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        attack_name,
        COUNT(*) AS count
      FROM prediction_logs
      GROUP BY attack_name
      ORDER BY count DESC
    `);

    const chartData = rows.map((row) => ({
      attack_name: row.attack_name,
      count: Number(row.count),
    }));

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("Chart Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch chart data",
      error: error.message,
    });
  }
});

/* =========================================================
   HISTORY ROUTE
   GET /api/predict/history
   ========================================================= */

router.get("/history", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        attack_name,
        prediction,
        confidence,
        client_ip,
        destination_port,
        severity,
        created_at
      FROM prediction_logs
      ORDER BY id DESC
      LIMIT 100
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch prediction history",
      error: error.message,
    });
  }
});

/* =========================================================
   ALERTS ROUTE
   GET /api/predict/alerts
   ========================================================= */

router.get("/alerts", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        attack_name,
        prediction,
        confidence,
        client_ip,
        destination_port,
        severity,
        created_at
      FROM prediction_logs
      WHERE attack_name <> 'BENIGN'
      ORDER BY id DESC
      LIMIT 20
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Alerts Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      error: error.message,
    });
  }
});

/* =========================================================
   EXPORT ROUTER
   ========================================================= */

module.exports = router;