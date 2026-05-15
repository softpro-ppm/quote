const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/http");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return sendError(res, 401, "Authentication required");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured");
    return sendError(res, 500, "Server configuration error");
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.id,
      username: payload.username,
    };
    return next();
  } catch {
    return sendError(res, 401, "Invalid or expired token");
  }
}

module.exports = { requireAuth };
