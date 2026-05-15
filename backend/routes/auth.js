const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const { sendSuccess, sendError } = require("../utils/http");

const router = express.Router();

function normalizePhpBcryptHash(hash) {
  if (typeof hash === "string" && hash.startsWith("$2y$")) {
    return `$2a$${hash.slice(4)}`;
  }
  return hash;
}

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return sendError(res, 400, "Username and password are required");
    }

    const rows = await query(
      "SELECT id, username, email, password_hash FROM users WHERE username = ? LIMIT 1",
      [String(username).trim()],
    );

    if (!rows.length) {
      return sendError(res, 401, "Invalid username or password");
    }

    const user = rows[0];
    const hash = normalizePhpBcryptHash(user.password_hash);
    const valid = await bcrypt.compare(String(password), hash);

    if (!valid) {
      return sendError(res, 401, "Invalid username or password");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not configured");
      return sendError(res, 500, "Server configuration error");
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      secret,
      { expiresIn: "7d" },
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("POST /auth/login error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

module.exports = router;
