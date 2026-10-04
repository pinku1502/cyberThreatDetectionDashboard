const { verifyToken } = require("../services/authService");

const requireAuth = (req, res, next) => {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Insufficient permissions" });
  }
  next();
};

module.exports = { requireAuth, requireRoles };