const crypto = require("crypto");
const db = require("../config/db");

const FAILURE_THRESHOLD = 5;
const LOGIN_WINDOW_MINUTES = 5;
const API_THRESHOLD = 60;
const API_WINDOW_SECONDS = 10;
const IP_WINDOW_MINUTES = 5;

const normalizeEmail = (email) => (email ? String(email).trim().toLowerCase() : null);

const lockName = (kind, websiteId, value) =>
  "website-" + kind + "-" + crypto.createHash("sha256")
    .update(String(websiteId) + "\0" + String(value))
    .digest("hex")
    .slice(0, 48);

const withLock = async (connection, name, callback) => {
  const [rows] = await connection.execute("SELECT GET_LOCK(?, 10) AS acquired", [name]);
  if (Number(rows[0]?.acquired) !== 1) throw new Error("Could not acquire detection lock");
  try {
    return await callback();
  } finally {
    await connection.execute("SELECT RELEASE_LOCK(?)", [name]);
  }
};

const insertDerivedEvent = async (connection, sourceId, eventType) => {
  const [result] = await connection.execute(
    "INSERT INTO website_security_events (website_id, event_type, client_ip, user_email, endpoint, http_method, http_status_code, related_event_id) " +
    "SELECT website_id, ?, client_ip, user_email, endpoint, http_method, http_status_code, id " +
    "FROM website_security_events WHERE id = ? AND website_id IS NOT NULL",
    [eventType, sourceId]
  );
  return result.affectedRows === 1;
};

const hasRecentDerivedEvent = async (connection, websiteId, eventType, clientIp, email, endpoint) => {
  let query = "SELECT id FROM website_security_events WHERE website_id = ? AND event_type = ? AND created_at >= CURRENT_TIMESTAMP - INTERVAL 5 MINUTE";
  const params = [websiteId, eventType];

  if (clientIp) {
    query += " AND client_ip = ?";
    params.push(clientIp);
  }
  if (email) {
    query += " AND LOWER(TRIM(user_email)) = ?";
    params.push(email);
  }
  if (endpoint) {
    query += " AND endpoint = ?";
    params.push(endpoint);
  }

  query += " LIMIT 1";
  const [rows] = await connection.execute(query, params);
  return rows.length > 0;
};

const detectFailedLogins = async (connection, websiteId, clientIp, sourceId) => {
  if (!clientIp) return;

  const [rows] = await connection.execute(
    "SELECT id FROM website_security_events WHERE website_id = ? AND client_ip = ? AND event_type = 'LOGIN_FAILED' AND created_at >= CURRENT_TIMESTAMP - INTERVAL 5 MINUTE ORDER BY created_at DESC, id DESC LIMIT ?",
    [websiteId, clientIp, FAILURE_THRESHOLD]
  );

  if (rows.length < FAILURE_THRESHOLD ||
      await hasRecentDerivedEvent(connection, websiteId, "MULTIPLE_FAILED_LOGIN", clientIp, null, null)) {
    return;
  }

  await insertDerivedEvent(connection, sourceId, "MULTIPLE_FAILED_LOGIN");
};

const detectSuspiciousIp = async (connection, websiteId, email, currentEventId) => {
  if (!email) return;

  const [rows] = await connection.execute(
    "SELECT COUNT(DISTINCT client_ip) AS unique_ip_count FROM website_security_events WHERE website_id = ? AND event_type = 'LOGIN_SUCCESS' AND LOWER(TRIM(user_email)) = ? AND created_at >= CURRENT_TIMESTAMP - INTERVAL 5 MINUTE AND client_ip IS NOT NULL",
    [websiteId, email]
  );

  if (Number(rows[0]?.unique_ip_count || 0) < 2 ||
      await hasRecentDerivedEvent(connection, websiteId, "SUSPICIOUS_IP_ACTIVITY", null, email, null)) {
    return;
  }

  await insertDerivedEvent(connection, currentEventId, "SUSPICIOUS_IP_ACTIVITY");
};

const recordLoginOutcome = async (attemptId, eventType, statusCode, websiteId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [attempts] = await connection.execute(
      "SELECT client_ip, user_email FROM website_security_events WHERE id = ? AND website_id = ? AND event_type = 'LOGIN_ATTEMPT' AND http_status_code IS NULL FOR UPDATE",
      [attemptId, websiteId]
    );
    if (attempts.length !== 1) {
      await connection.rollback();
      return false;
    }

    const clientIp = attempts[0].client_ip;
    const email = normalizeEmail(attempts[0].user_email);

    await connection.execute(
      "UPDATE website_security_events SET http_status_code = ? WHERE id = ? AND website_id = ? AND event_type = 'LOGIN_ATTEMPT' AND http_status_code IS NULL",
      [statusCode, attemptId, websiteId]
    );

    const [inserted] = await connection.execute(
      "INSERT INTO website_security_events (website_id, event_type, client_ip, user_email, endpoint, http_method, http_status_code, related_event_id) " +
      "SELECT website_id, ?, client_ip, user_email, endpoint, http_method, ?, id FROM website_security_events WHERE id = ? AND website_id = ? AND event_type = 'LOGIN_ATTEMPT'",
      [eventType, statusCode, attemptId, websiteId]
    );

    if (inserted.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    await connection.commit();

    if (eventType === "LOGIN_FAILED" && clientIp) {
      const detectionConnection = await db.getConnection();
      try {
        await withLock(detectionConnection, lockName("login", websiteId, clientIp), () =>
          detectFailedLogins(detectionConnection, websiteId, clientIp, inserted.insertId)
        );
      } finally {
        detectionConnection.release();
      }
    }

    if (eventType === "LOGIN_SUCCESS" && email) {
      const detectionConnection = await db.getConnection();
      try {
        await withLock(detectionConnection, lockName("email", websiteId, email), () =>
          detectSuspiciousIp(detectionConnection, websiteId, email, inserted.insertId)
        );
      } finally {
        detectionConnection.release();
      }
    }

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const detectRepeatedApiRequest = async (websiteId, clientIp, endpoint, sourceId, requestTime) => {
  if (!clientIp) return;

  const connection = await db.getConnection();
  try {
    await withLock(connection, lockName("api", websiteId, clientIp + "\0" + endpoint), async () => {
      const windowStart = new Date(requestTime.getTime() - API_WINDOW_SECONDS * 1000);
      const [rows] = await connection.execute(
        "SELECT id FROM website_security_events WHERE website_id = ? AND client_ip = ? AND endpoint = ? AND event_type = 'API_REQUEST' AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC, id DESC LIMIT ?",
        [websiteId, clientIp, endpoint, windowStart, requestTime, API_THRESHOLD]
      );

      if (rows.length >= API_THRESHOLD &&
          !(await hasRecentDerivedEvent(connection, websiteId, "REPEATED_API_REQUEST", clientIp, null, endpoint))) {
        await insertDerivedEvent(connection, sourceId, "REPEATED_API_REQUEST");
      }
    });
  } finally {
    connection.release();
  }
};

const recordApiRequest = async ({ websiteId, clientIp, endpoint, httpMethod, statusCode, occurredAt }) => {
  const requestTime = new Date(occurredAt);
  if (Number.isNaN(requestTime.getTime())) throw new Error("Invalid API request timestamp");

  requestTime.setMilliseconds(0);

  const [inserted] = await db.execute(
    "INSERT INTO website_security_events (website_id, event_type, client_ip, endpoint, http_method, http_status_code, created_at) VALUES (?, 'API_REQUEST', ?, ?, ?, ?, ?)",
    [websiteId, clientIp, endpoint, httpMethod, statusCode, requestTime]
  );

  if (clientIp) {
    setImmediate(() => detectRepeatedApiRequest(websiteId, clientIp, endpoint, inserted.insertId, requestTime)
      .catch((error) => console.error("Repeated API request detection error:", error.message)));
  }

  return { id: inserted.insertId };
};

module.exports = { recordLoginOutcome, recordApiRequest };
