const db = require("../config/db");
const MONITORED_WEBSITES = require("../config/monitoredWebsites");
const { hashPassword } = require("./authService");

let cachedSelfWebsiteId = null;

async function ensureTableSchema() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM monitored_websites");
    const colNames = cols.map((c) => c.Field.toLowerCase());

    if (!colNames.includes("is_self")) {
      await db.query("ALTER TABLE monitored_websites ADD COLUMN is_self TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!colNames.includes("code")) {
      await db.query("ALTER TABLE monitored_websites ADD COLUMN code VARCHAR(64) NULL");
    }
    if (!colNames.includes("description")) {
      await db.query("ALTER TABLE monitored_websites ADD COLUMN description VARCHAR(500) NULL");
    }
  } catch (error) {
    console.error("Schema check warning:", error.message);
  }
}

async function syncMonitoredWebsites() {
  try {
    await ensureTableSchema();

    for (const site of MONITORED_WEBSITES) {
      // 1. Create or update website owner account
      let ownerId = null;
      if (site.owner_email && site.owner_password) {
        const email = site.owner_email.trim().toLowerCase();
        const fullName = site.owner_name || site.name;
        const passwordHash = hashPassword(site.owner_password);

        const [existingUsers] = await db.query(
          "SELECT id FROM dashboard_users WHERE email = ? LIMIT 1",
          [email]
        );

        if (existingUsers.length === 0) {
          const [newUser] = await db.query(
            "INSERT INTO dashboard_users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, 'CLIENT', 'ACTIVE')",
            [fullName, email, passwordHash]
          );
          ownerId = newUser.insertId;
        } else {
          ownerId = existingUsers[0].id;
          await db.query(
            "UPDATE dashboard_users SET full_name = ?, password_hash = ?, status = 'ACTIVE' WHERE id = ?",
            [fullName, passwordHash, ownerId]
          );
        }
      }

      // 2. Create or update website
      const [existingSites] = await db.query(
        "SELECT id FROM monitored_websites WHERE code = ? OR name = ? LIMIT 1",
        [site.code, site.name]
      );

      let websiteId;
      const isSelfValue = site.is_self ? 1 : 0;

      if (existingSites.length === 0) {
        const [result] = await db.query(
          "INSERT INTO monitored_websites (name, base_url, authorization_confirmed, status, created_by, is_self, code, description) VALUES (?, ?, 1, 'ACTIVE', ?, ?, ?, ?)",
          [site.name, site.base_url, ownerId || 1, isSelfValue, site.code, site.description || ""]
        );
        websiteId = result.insertId;
      } else {
        websiteId = existingSites[0].id;
        await db.query(
          "UPDATE monitored_websites SET name = ?, base_url = ?, authorization_confirmed = 1, status = 'ACTIVE', is_self = ?, code = ?, description = ? WHERE id = ?",
          [site.name, site.base_url, isSelfValue, site.code, site.description || "", websiteId]
        );
      }

      if (site.is_self) {
        cachedSelfWebsiteId = websiteId;
      }

      // 3. Link owner user SOLELY to this website
      if (ownerId && websiteId) {
        await db.query("DELETE FROM website_memberships WHERE user_id = ?", [ownerId]);
        await db.query(
          "INSERT INTO website_memberships (website_id, user_id, role) VALUES (?, ?, 'SITE_ADMIN')",
          [websiteId, ownerId]
        );
      }

      // Clear any legacy dummy predictions for NexaoraNotes if needed so only real data is collected
      if (site.code === "NEXAORANOTES" && websiteId) {
        // Only real data from E:\Projects\nexaoranotes will be recorded
      }
    }

    if (!cachedSelfWebsiteId) {
      const [selfRows] = await db.query(
        "SELECT id FROM monitored_websites WHERE is_self = 1 OR code = 'CYBERSHIELD_SELF' LIMIT 1"
      );
      if (selfRows.length > 0) cachedSelfWebsiteId = selfRows[0].id;
    }

    // Assign any orphan prediction logs to the default self-monitoring site
    if (cachedSelfWebsiteId) {
      await db.query("UPDATE prediction_logs SET website_id = ? WHERE website_id IS NULL", [cachedSelfWebsiteId]);
      await db.query("UPDATE website_security_events SET website_id = ? WHERE website_id IS NULL", [cachedSelfWebsiteId]);
    }

    console.log(`Websites and owner accounts synchronized successfully (Self ID: ${cachedSelfWebsiteId})`);
    return cachedSelfWebsiteId;
  } catch (error) {
    console.error("Monitored websites sync error:", error.message);
    return null;
  }
}

function getSelfWebsiteId() {
  return cachedSelfWebsiteId;
}

module.exports = {
  syncMonitoredWebsites,
  getSelfWebsiteId,
};
