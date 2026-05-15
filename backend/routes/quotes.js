const express = require("express");
const { query } = require("../db");
const { sendSuccess, sendError } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

const FOLLOWUP_SUBQUERY = `
  (SELECT f.notes FROM followups f WHERE f.quote_id = q.id ORDER BY f.created_at DESC, f.id DESC LIMIT 1) AS latest_followup,
  (SELECT f.created_at FROM followups f WHERE f.quote_id = q.id ORDER BY f.created_at DESC, f.id DESC LIMIT 1) AS latest_followup_date
`;

function todayDateString() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function generateQuoteNumber() {
  const prefix = `Q${todayDateString()}-`;
  const rows = await query(
    "SELECT quote_number FROM quotes WHERE quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1",
    [`${prefix}%`],
  );

  let seq = 1;
  if (rows.length) {
    const last = rows[0].quote_number;
    const part = last.slice(prefix.length);
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function fetchExecutive(executiveId) {
  if (!executiveId) return null;
  const rows = await query(
    "SELECT id, name, email, phone FROM executives WHERE id = ? LIMIT 1",
    [executiveId],
  );
  if (!rows.length) return null;
  const e = rows[0];
  return { name: e.name, email: e.email, phone: e.phone };
}

router.get("/stats", async (req, res) => {
  try {
    const [row] = await query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) AS thisMonth,
        SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM followups f WHERE f.quote_id = quotes.id) THEN 1 ELSE 0 END) AS pendingFollowups
      FROM quotes`,
    );

    return sendSuccess(res, {
      total: Number(row?.total) || 0,
      today: Number(row?.today) || 0,
      thisMonth: Number(row?.thisMonth) || 0,
      pendingFollowups: Number(row?.pendingFollowups) || 0,
    });
  } catch (err) {
    console.error("GET /quotes/stats error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    let where = "";
    const params = [];

    if (search) {
      where = `WHERE (
        q.quote_number LIKE ? OR
        q.owner_name LIKE ? OR
        q.vehicle_number LIKE ? OR
        q.vehicle_model LIKE ? OR
        q.phone_number LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM quotes q ${where}`,
      params,
    );
    const total = Number(countRows[0]?.total) || 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const rows = await query(
      `SELECT q.*, ${FOLLOWUP_SUBQUERY}
       FROM quotes q
       ${where}
       ORDER BY q.created_at DESC, q.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("GET /quotes error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 400, "Invalid quote id");

    const rows = await query("SELECT * FROM quotes WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) return sendError(res, 404, "Quote not found");

    const quote = rows[0];
    quote.executive = await fetchExecutive(quote.executive_id);

    return sendSuccess(res, quote);
  } catch (err) {
    console.error("GET /quotes/:id error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const idv = Number(body.idv);
    const odDiscount = Number(body.od_discount);
    const ncb = Number(body.ncb);
    const goldPremium = Number(body.gold_premium);
    const platinumPremium = Number(body.platinum_premium);

    if (!Number.isFinite(idv) || idv <= 0) {
      return sendError(res, 400, "Valid idv is required");
    }
    if (!Number.isFinite(goldPremium) || !Number.isFinite(platinumPremium)) {
      return sendError(res, 400, "gold_premium and platinum_premium are required");
    }

    const quoteNumber = await generateQuoteNumber();
    const isEv = body.is_ev === 1 || body.is_ev === true || body.is_ev === "1" ? 1 : 0;
    const executiveId = body.executive_id ? Number(body.executive_id) : null;

    const result = await query(
      `INSERT INTO quotes (
        quote_number, owner_name, vehicle_number, vehicle_model, phone_number,
        idv, od_discount, ncb, executive_id, gold_premium, platinum_premium, is_ev
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quoteNumber,
        body.owner_name || null,
        body.vehicle_number || null,
        body.vehicle_model || null,
        body.phone_number || null,
        idv,
        Number.isFinite(odDiscount) ? odDiscount : 90,
        Number.isFinite(ncb) ? ncb : 20,
        executiveId,
        goldPremium,
        platinumPremium,
        isEv,
      ],
    );

    const insertId = result.insertId;
    const rows = await query("SELECT * FROM quotes WHERE id = ? LIMIT 1", [insertId]);

    return sendSuccess(res, rows[0] || { id: insertId, quote_number: quoteNumber }, 201);
  } catch (err) {
    if (err.code === "ER_BAD_FIELD_ERROR" && String(err.message).includes("is_ev")) {
      console.error("POST /quotes: is_ev column missing — run migration");
      return sendError(
        res,
        500,
        "Database schema outdated (missing is_ev). Run backend/database/migrations/add_is_ev_to_quotes.sql",
      );
    }
    console.error("POST /quotes error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 400, "Invalid quote id");

    await query("DELETE FROM followups WHERE quote_id = ?", [id]);
    const result = await query("DELETE FROM quotes WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Quote not found");
    }

    return sendSuccess(res, { id });
  } catch (err) {
    console.error("DELETE /quotes/:id error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

module.exports = router;
