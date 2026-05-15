const express = require("express");
const { query } = require("../db");
const { sendSuccess, sendError } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/:quoteId", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId, 10);
    if (!quoteId) return sendError(res, 400, "Invalid quote id");

    const rows = await query(
      `SELECT id, quote_id, notes, created_at, created_by
       FROM followups
       WHERE quote_id = ?
       ORDER BY created_at DESC, id DESC`,
      [quoteId],
    );

    return sendSuccess(res, rows);
  } catch (err) {
    console.error("GET /followups/:quoteId error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.post("/", async (req, res) => {
  try {
    const { quote_id, notes } = req.body || {};
    const quoteId = parseInt(quote_id, 10);

    if (!quoteId) {
      return sendError(res, 400, "quote_id is required");
    }
    if (!notes || !String(notes).trim()) {
      return sendError(res, 400, "notes are required");
    }

    const quotes = await query("SELECT id FROM quotes WHERE id = ? LIMIT 1", [
      quoteId,
    ]);
    if (!quotes.length) {
      return sendError(res, 404, "Quote not found");
    }

    const createdBy = req.user?.username || null;

    const result = await query(
      `INSERT INTO followups (quote_id, notes, created_by)
       VALUES (?, ?, ?)`,
      [quoteId, String(notes).trim(), createdBy],
    );

    const rows = await query("SELECT * FROM followups WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);

    return sendSuccess(res, rows[0], 201);
  } catch (err) {
    console.error("POST /followups error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

module.exports = router;
