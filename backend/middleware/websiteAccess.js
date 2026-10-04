const db = require("../config/db");

const parseWebsiteId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const canAccessWebsite = async (user, websiteId) => {
  if (user.role === "SUPER_ADMIN") return true;
  const [rows] = await db.execute("SELECT 1 FROM website_memberships WHERE website_id = ? AND user_id = ? LIMIT 1", [websiteId, user.sub]);
  return rows.length > 0;
};

const requireWebsiteAccess = async (req, res, next) => {
  const websiteId = parseWebsiteId(req.query.website_id ?? req.body?.website_id);
  if (!websiteId) return res.status(400).json({ success: false, message: "website_id is required" });
  try {
    if (!(await canAccessWebsite(req.user, websiteId))) return res.status(403).json({ success: false, message: "Website access denied" });
    req.websiteId = websiteId;
    return next();
  } catch (error) {
    console.error("Website access error:", error.message);
    return res.status(500).json({ success: false, message: "Could not verify website access" });
  }
};

module.exports = { parseWebsiteId, canAccessWebsite, requireWebsiteAccess };
