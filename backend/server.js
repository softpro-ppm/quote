require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getPool } = require("./db");
const { sendError } = require("./utils/http");

const authRoutes = require("./routes/auth");
const quotesRoutes = require("./routes/quotes");
const executivesRoutes = require("./routes/executives");
const followupsRoutes = require("./routes/followups");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const defaultOrigins = [
  "https://softpromis.com",
  "https://www.softpromis.com",
  "https://softpromis.com/quote",
  "https://quote.softpromis.com",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
];

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return defaultOrigins;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCorsOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (
        origin === "https://softpromis.com" ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (req, res) => {
  try {
    await getPool().query("SELECT 1");
    return res.json({ success: true, data: { status: "ok" } });
  } catch (err) {
    console.error("Health check failed:", err.message);
    return res.status(503).json({
      success: false,
      error: { message: "Database unavailable" },
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/quotes", quotesRoutes);
app.use("/api/executives", executivesRoutes);
app.use("/api/followups", followupsRoutes);

app.use((req, res) => {
  sendError(res, 404, "Not found");
});

app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return sendError(res, 403, "CORS not allowed");
  }
  console.error("Unhandled error:", err);
  return sendError(res, 500, "Internal server error");
});

app.listen(PORT, () => {
  console.log(`SBI Quote API listening on port ${PORT}`);
});
