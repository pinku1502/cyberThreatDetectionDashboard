const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const envPath = fs.existsSync(path.resolve(__dirname, "../.env"))
  ? path.resolve(__dirname, "../.env")
  : path.resolve(__dirname, "../../.env");
require("dotenv").config({ path: envPath });

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return process.env.JWT_SECRET;
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
};

const verifyPassword = (password, storedHash) => {
  const [salt, expected] = String(storedHash || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
};

const signUser = (user) =>
  jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email, name: user.full_name },
    getJwtSecret(),
    { expiresIn: "8h" }
  );

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = { hashPassword, verifyPassword, signUser, verifyToken };