const crypto = require("crypto");
const db = require("../config/db");

const FAILURE_THRESHOLD = 5;
const WINDOW_MS = 5 * 60 * 1000;
const REPEATED_API_REQUEST_THRESHOLD = 60;
const REPEATED_API_REQUEST_WINDOW_MS = 10 * 1000;
const SUSPICIOUS_IP_WINDOW_MS = 5 * 60 * 1000;

const getIpLockName = (clientIp) =>
  `website-login-${crypto.createHash("sha256").update(clientIp).digest("hex").slice(0, 48)}`;

const getApiRequestLockName = (clientIp, endpoint) =>
  `website-api-${crypto
    .createHash("sha256")
    .update(`${clientIp}\0${endpoint}`)
    .digest("hex")
    .slice(0, 48)}`;

const getEmailLockName = (userEmail) =>
  `website-email-${crypto
    .createHash("sha256")
    .update(userEmail)
    .digest("hex")
    .slice(0, 48)}`;

const normalizeIp = (clientIp) => {
  if (!clientIp) return null;

  const normalized = String(clientIp).replace(/^::ffff:/, "");

  if (normalized === "::1" || normalized === "127.0.0.1") {
    return "LOOPBACK";
  }

  return normalized;
};

const normalizeEmail = (email) => {
  if (!email) return null;
  return String(email).trim().toLowerCase();
};

const insertMultipleFailureAlert = async (connection, failedEventId) => {
  const [result] = await connection.execute(
    `INSERT INTO website_security_events
      (event_type, client_ip, user_email, endpoint, http_method, http_status_code, related_event_id)
     SELECT 'MULTIPLE_FAILED_LOGIN', client_ip, user_email, endpoint, http_method, http_status_code, id
     FROM website_security_events
     WHERE id = ? AND event_type = 'LOGIN_FAILED'`,
    [failedEventId]
  );

  return result.affectedRows === 1;
};

const getUnalertedEpisodeTrigger = async (
  connection,
  clientIp,
  currentFailedEventId
) => {
  const [alerts] = await connection.execute(
    `SELECT id, related_event_id, created_at
     FROM website_security_events
     WHERE client_ip = ? AND event_type = 'MULTIPLE_FAILED_LOGIN'
     ORDER BY id DESC
     LIMIT 1`,
    [clientIp]
  );

  if (alerts.length === 0) {
    const [recentFailures] = await connection.execute(
      `SELECT id
       FROM website_security_events
       WHERE client_ip = ?
         AND event_type = 'LOGIN_FAILED'
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL 5 MINUTE
       ORDER BY id DESC
       LIMIT ?`,
      [clientIp, FAILURE_THRESHOLD]
    );

    return recentFailures.length >= FAILURE_THRESHOLD
      ? currentFailedEventId
      : null;
  }

  const previousAlert = alerts[0];
  const previousTriggerId = Number(previousAlert.related_event_id);

  if (!Number.isSafeInteger(previousTriggerId) || previousTriggerId < 1) {
    const [recentAlerts] = await connection.execute(
      `SELECT id
       FROM website_security_events
       WHERE client_ip = ?
         AND event_type = 'MULTIPLE_FAILED_LOGIN'
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL 5 MINUTE
       LIMIT 1`,
      [clientIp]
    );

    if (recentAlerts.length > 0) return null;

    const [recentFailures] = await connection.execute(
      `SELECT id
       FROM website_security_events
       WHERE client_ip = ?
         AND event_type = 'LOGIN_FAILED'
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL 5 MINUTE
       ORDER BY id DESC
       LIMIT ?`,
      [clientIp, FAILURE_THRESHOLD]
    );

    return recentFailures.length >= FAILURE_THRESHOLD
      ? currentFailedEventId
      : null;
  }

  const [seedFailures] = await connection.execute(
    `SELECT id, created_at
     FROM website_security_events
     WHERE client_ip = ?
       AND event_type = 'LOGIN_FAILED'
       AND id <= ?
     ORDER BY id DESC
     LIMIT ?`,
    [clientIp, previousTriggerId, FAILURE_THRESHOLD]
  );

  if (seedFailures.length < FAILURE_THRESHOLD) {
    return currentFailedEventId;
  }

  const [laterFailures] = await connection.execute(
    `SELECT id, created_at
     FROM website_security_events
     WHERE client_ip = ?
       AND event_type = 'LOGIN_FAILED'
       AND id > ?
       AND id <= ?
     ORDER BY id ASC`,
    [clientIp, previousTriggerId, currentFailedEventId]
  );

  const rollingFailures = seedFailures
    .reverse()
    .map((event) => new Date(event.created_at).getTime());

  let alertGeneratedInEpisode = true;
  let newEpisodeTriggerId = null;

  for (const failedEvent of laterFailures) {
    const eventTime = new Date(failedEvent.created_at).getTime();

    while (
      rollingFailures.length > 0 &&
      rollingFailures[0] < eventTime - WINDOW_MS
    ) {
      rollingFailures.shift();
    }

    if (rollingFailures.length < FAILURE_THRESHOLD) {
      alertGeneratedInEpisode = false;
      newEpisodeTriggerId = null;
    }

    rollingFailures.push(eventTime);

    if (
      rollingFailures.length >= FAILURE_THRESHOLD &&
      !alertGeneratedInEpisode
    ) {
      alertGeneratedInEpisode = true;
      newEpisodeTriggerId = Number(failedEvent.id);
    }
  }

  return newEpisodeTriggerId;
};

const insertSuspiciousIpAlert = async (
  connection,
  loginEventId
) => {
  const [result] = await connection.execute(
    `INSERT INTO website_security_events
      (event_type, client_ip, user_email, endpoint, http_method, http_status_code, related_event_id)
     SELECT 'SUSPICIOUS_IP_ACTIVITY', client_ip, user_email, endpoint, http_method, http_status_code, id
     FROM website_security_events
     WHERE id = ? AND event_type = 'LOGIN_SUCCESS'`,
    [loginEventId]
  );

  return result.affectedRows === 1;
};

const detectSuspiciousIpActivity = async (
  connection,
  userEmail,
  currentLoginEventId
) => {
  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail) return false;

  const [currentRows] = await connection.execute(
    `SELECT client_ip, created_at
     FROM website_security_events
     WHERE id = ?
       AND event_type = 'LOGIN_SUCCESS'
       AND LOWER(TRIM(user_email)) = ?`,
    [currentLoginEventId, normalizedEmail]
  );

  if (currentRows.length !== 1) {
    return false;
  }

  const currentTime = new Date(currentRows[0].created_at);

  if (Number.isNaN(currentTime.getTime())) {
    return false;
  }

  const windowStart = new Date(
    currentTime.getTime() - SUSPICIOUS_IP_WINDOW_MS
  );

  const [ipRows] = await connection.execute(
    `SELECT COUNT(DISTINCT client_ip) AS unique_ip_count
     FROM website_security_events
     WHERE event_type = 'LOGIN_SUCCESS'
       AND LOWER(TRIM(user_email)) = ?
       AND created_at >= ?
       AND created_at <= ?
       AND client_ip IS NOT NULL`,
    [
      normalizedEmail,
      windowStart,
      currentTime
    ]
  );

  const uniqueIpCount = Number(
    ipRows[0]?.unique_ip_count || 0
  );

  if (uniqueIpCount < 2) {
    return false;
  }

  const [existingAlerts] = await connection.execute(
    `SELECT id
     FROM website_security_events
     WHERE event_type = 'SUSPICIOUS_IP_ACTIVITY'
       AND LOWER(TRIM(user_email)) = ?
       AND created_at >= ?
     ORDER BY id DESC
     LIMIT 1`,
    [
      normalizedEmail,
      windowStart
    ]
  );

  if (existingAlerts.length > 0) {
    return false;
  }

  return insertSuspiciousIpAlert(
    connection,
    currentLoginEventId
  );
};

const recordLoginOutcome = async (
  attemptId,
  eventType,
  statusCode
) => {
  const connection = await db.getConnection();

  let lockName = null;
  let lockAcquired = false;

  let emailLockName = null;
  let emailLockAcquired = false;

  let transactionStarted = false;

  let successfulLoginEventId = null;
  let successfulLoginEmail = null;

  try {
    const [attempts] = await connection.execute(
      `SELECT client_ip, user_email
       FROM website_security_events
       WHERE id = ?
         AND event_type = 'LOGIN_ATTEMPT'
         AND http_status_code IS NULL`,
      [attemptId]
    );

    if (attempts.length !== 1) {
      return false;
    }

    const clientIp = attempts[0].client_ip;
    const userEmail = attempts[0].user_email;

    if (eventType === "LOGIN_FAILED" && clientIp) {
      lockName = getIpLockName(clientIp);

      const [lockRows] = await connection.execute(
        "SELECT GET_LOCK(?, 10) AS acquired",
        [lockName]
      );

      lockAcquired = Number(lockRows[0]?.acquired) === 1;

      if (!lockAcquired) {
        throw new Error(
          "Could not acquire login detection lock"
        );
      }
    }

    if (eventType === "LOGIN_SUCCESS" && userEmail) {
      emailLockName = getEmailLockName(
        normalizeEmail(userEmail)
      );

      const [lockRows] = await connection.execute(
        "SELECT GET_LOCK(?, 10) AS acquired",
        [emailLockName]
      );

      emailLockAcquired =
        Number(lockRows[0]?.acquired) === 1;

      if (!emailLockAcquired) {
        throw new Error(
          "Could not acquire IP activity detection lock"
        );
      }
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [updated] = await connection.execute(
      `UPDATE website_security_events
       SET http_status_code = ?
       WHERE id = ?
         AND event_type = 'LOGIN_ATTEMPT'
         AND http_status_code IS NULL`,
      [statusCode, attemptId]
    );

    if (updated.affectedRows !== 1) {
      await connection.rollback();
      transactionStarted = false;
      return false;
    }

    const [inserted] = await connection.execute(
      `INSERT INTO website_security_events
        (event_type, client_ip, user_email, endpoint, http_method, http_status_code, related_event_id)
       SELECT ?, client_ip, user_email, endpoint, http_method, ?, id
       FROM website_security_events
       WHERE id = ?
         AND event_type = 'LOGIN_ATTEMPT'`,
      [
        eventType,
        statusCode,
        attemptId
      ]
    );

    if (inserted.affectedRows !== 1) {
      await connection.rollback();
      transactionStarted = false;
      return false;
    }

    if (
      eventType === "LOGIN_FAILED" &&
      clientIp &&
      lockAcquired
    ) {
      const triggerEventId =
        await getUnalertedEpisodeTrigger(
          connection,
          clientIp,
          inserted.insertId
        );

      if (triggerEventId !== null) {
        await insertMultipleFailureAlert(
          connection,
          triggerEventId
        );
      }
    }

    if (
      eventType === "LOGIN_SUCCESS" &&
      userEmail &&
      emailLockAcquired
    ) {
      successfulLoginEventId = inserted.insertId;
      successfulLoginEmail = userEmail;
    }

    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (lockAcquired) {
      try {
        await connection.execute(
          "SELECT RELEASE_LOCK(?)",
          [lockName]
        );
      } catch (error) {
        console.error(
          "Could not release login detection lock:",
          error.message
        );
      }
    }

    if (emailLockAcquired) {
      try {
        await connection.execute(
          "SELECT RELEASE_LOCK(?)",
          [emailLockName]
        );
      } catch (error) {
        console.error(
          "Could not release IP activity detection lock:",
          error.message
        );
      }
    }

    connection.release();
  }

  if (
    successfulLoginEventId &&
    successfulLoginEmail
  ) {
    const detectionConnection =
      await db.getConnection();

    let detectionLockAcquired = false;

    try {
      const normalizedEmail =
        normalizeEmail(
          successfulLoginEmail
        );

      const detectionLockName =
        getEmailLockName(
          normalizedEmail
        );

      const [lockRows] =
        await detectionConnection.execute(
          "SELECT GET_LOCK(?, 10) AS acquired",
          [detectionLockName]
        );

      detectionLockAcquired =
        Number(lockRows[0]?.acquired) === 1;

      if (!detectionLockAcquired) {
        throw new Error(
          "Could not acquire suspicious IP detection lock"
        );
      }

      await detectSuspiciousIpActivity(
        detectionConnection,
        normalizedEmail,
        successfulLoginEventId
      );
    } catch (error) {
      console.error(
        "Suspicious IP detection error:",
        error.message
      );
    } finally {
      if (detectionLockAcquired) {
        try {
          const normalizedEmail =
            normalizeEmail(
              successfulLoginEmail
            );

          const detectionLockName =
            getEmailLockName(
              normalizedEmail
            );

          await detectionConnection.execute(
            "SELECT RELEASE_LOCK(?)",
            [detectionLockName]
          );
        } catch (error) {
          console.error(
            "Could not release suspicious IP detection lock:",
            error.message
          );
        }
      }

      detectionConnection.release();
    }
  }

  return true;
};

const getRepeatedApiRequestTrigger = async (
  connection,
  clientIp,
  endpoint,
  currentRequestId,
  eventTime
) => {
  const [alerts] = await connection.execute(
    `SELECT related_event_id
     FROM website_security_events
     WHERE client_ip = ?
       AND endpoint = ?
       AND event_type = 'REPEATED_API_REQUEST'
     ORDER BY id DESC
     LIMIT 1`,
    [clientIp, endpoint]
  );

  if (alerts.length === 0) {
    const windowStart = new Date(
      eventTime.getTime() -
      REPEATED_API_REQUEST_WINDOW_MS
    );

    const [recentRequests] =
      await connection.execute(
        `SELECT id
         FROM website_security_events
         WHERE client_ip = ?
           AND endpoint = ?
           AND event_type = 'API_REQUEST'
           AND created_at >= ?
           AND (
             created_at < ? OR
             (created_at = ? AND id <= ?)
           )
         ORDER BY created_at ASC, id ASC
         LIMIT ?`,
        [
          clientIp,
          endpoint,
          windowStart,
          eventTime,
          eventTime,
          currentRequestId,
          REPEATED_API_REQUEST_THRESHOLD
        ]
      );

    return recentRequests.length >=
      REPEATED_API_REQUEST_THRESHOLD
      ? Number(
          recentRequests[
            REPEATED_API_REQUEST_THRESHOLD - 1
          ].id
        )
      : null;
  }

  const previousTriggerId =
    Number(alerts[0].related_event_id);

  if (
    !Number.isSafeInteger(previousTriggerId) ||
    previousTriggerId < 1
  ) {
    return null;
  }

  const [previousTriggerRows] =
    await connection.execute(
      `SELECT created_at
       FROM website_security_events
       WHERE id = ?
         AND event_type = 'API_REQUEST'`,
      [previousTriggerId]
    );

  if (previousTriggerRows.length !== 1) {
    return null;
  }

  const previousTriggerTime =
    new Date(previousTriggerRows[0].created_at);

  if (
    eventTime < previousTriggerTime ||
    (
      eventTime.getTime() ===
        previousTriggerTime.getTime() &&
      currentRequestId <= previousTriggerId
    )
  ) {
    return null;
  }

  const [seedRequests] =
    await connection.execute(
      `SELECT id, created_at
       FROM website_security_events
       WHERE client_ip = ?
         AND endpoint = ?
         AND event_type = 'API_REQUEST'
         AND (
           created_at < ? OR
           (created_at = ? AND id <= ?)
         )
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [
        clientIp,
        endpoint,
        previousTriggerTime,
        previousTriggerTime,
        previousTriggerId,
        REPEATED_API_REQUEST_THRESHOLD
      ]
    );

  if (
    seedRequests.length <
    REPEATED_API_REQUEST_THRESHOLD
  ) {
    return null;
  }

  const [laterRequests] =
    await connection.execute(
      `SELECT id, created_at
       FROM website_security_events
       WHERE client_ip = ?
         AND endpoint = ?
         AND event_type = 'API_REQUEST'
         AND (
           created_at > ? OR
           (created_at = ? AND id > ?)
         )
         AND (
           created_at < ? OR
           (created_at = ? AND id <= ?)
         )
       ORDER BY created_at ASC, id ASC`,
      [
        clientIp,
        endpoint,
        previousTriggerTime,
        previousTriggerTime,
        previousTriggerId,
        eventTime,
        eventTime,
        currentRequestId
      ]
    );

  const rollingRequests =
    seedRequests
      .reverse()
      .map((event) =>
        new Date(
          event.created_at
        ).getTime()
      );

  let alertGeneratedInWindow = true;
  let newWindowTriggerId = null;

  for (const requestEvent of laterRequests) {
    const requestTime =
      new Date(
        requestEvent.created_at
      ).getTime();

    while (
      rollingRequests.length > 0 &&
      rollingRequests[0] <
        requestTime -
        REPEATED_API_REQUEST_WINDOW_MS
    ) {
      rollingRequests.shift();
    }

    if (
      rollingRequests.length <
      REPEATED_API_REQUEST_THRESHOLD
    ) {
      alertGeneratedInWindow = false;
      newWindowTriggerId = null;
    }

    rollingRequests.push(requestTime);

    if (
      rollingRequests.length >=
        REPEATED_API_REQUEST_THRESHOLD &&
      !alertGeneratedInWindow
    ) {
      alertGeneratedInWindow = true;
      newWindowTriggerId =
        Number(requestEvent.id);
    }
  }

  return newWindowTriggerId;
};

const insertRepeatedApiRequestAlert = async (
  connection,
  requestEventId
) => {
  const [result] = await connection.execute(
    `INSERT INTO website_security_events
      (event_type, client_ip, endpoint, http_method, http_status_code, related_event_id)
     SELECT 'REPEATED_API_REQUEST', client_ip, endpoint, http_method, http_status_code, id
     FROM website_security_events
     WHERE id = ?
       AND event_type = 'API_REQUEST'`,
    [requestEventId]
  );

  return result.affectedRows === 1;
};

const detectRepeatedApiRequest = async ({
  clientIp,
  endpoint,
  requestEventId,
  requestTime
}) => {
  const connection =
    await db.getConnection();

  const lockName =
    getApiRequestLockName(
      clientIp,
      endpoint
    );

  let lockAcquired = false;
  let transactionStarted = false;

  try {
    const [lockRows] =
      await connection.execute(
        "SELECT GET_LOCK(?, 10) AS acquired",
        [lockName]
      );

    lockAcquired =
      Number(lockRows[0]?.acquired) === 1;

    if (!lockAcquired) {
      return;
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const triggerEventId =
      await getRepeatedApiRequestTrigger(
        connection,
        clientIp,
        endpoint,
        requestEventId,
        requestTime
      );

    if (triggerEventId !== null) {
      await insertRepeatedApiRequestAlert(
        connection,
        triggerEventId
      );
    }

    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (lockAcquired) {
      try {
        await connection.execute(
          "SELECT RELEASE_LOCK(?)",
          [lockName]
        );
      } catch (error) {
        console.error(
          "Could not release repeated API request lock:",
          error.message
        );
      }
    }

    connection.release();
  }
};

const recordApiRequest = async ({
  clientIp,
  endpoint,
  httpMethod,
  statusCode,
  occurredAt
}) => {
  const parsedRequestTime =
    new Date(occurredAt);

  if (
    Number.isNaN(
      parsedRequestTime.getTime()
    )
  ) {
    throw new Error(
      "Invalid API request timestamp"
    );
  }

  const requestTime =
    new Date(
      Math.floor(
        parsedRequestTime.getTime() / 1000
      ) * 1000
    );

  const [inserted] =
    await db.execute(
      `INSERT INTO website_security_events
        (event_type, client_ip, endpoint, http_method, http_status_code, created_at)
       VALUES ('API_REQUEST', ?, ?, ?, ?, ?)`,
      [
        clientIp,
        endpoint,
        httpMethod,
        statusCode,
        requestTime
      ]
    );

  if (clientIp) {
    setImmediate(() => {
      detectRepeatedApiRequest({
        clientIp,
        endpoint,
        requestEventId:
          inserted.insertId,
        requestTime
      }).catch((error) => {
        console.error(
          "Repeated API request detection error:",
          error.message
        );
      });
    });
  }

  return {
    id: inserted.insertId
  };
};

module.exports = {
  recordLoginOutcome,
  recordApiRequest
};