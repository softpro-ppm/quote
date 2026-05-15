const express = require("express");
const { query } = require("../db");
const { sendSuccess, sendError } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const activeOnly =
      req.query.active === "true" || req.query.active === true;

    let sql = "SELECT * FROM executives";
    const params = [];

    if (activeOnly) {
      sql += " WHERE is_active = 1";
    }

    sql += " ORDER BY name ASC";

    const rows = await query(sql, params);
    return sendSuccess(res, rows);
  } catch (err) {
    console.error("GET /executives error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, is_active } = req.body || {};

    if (!name || !String(name).trim()) {
      return sendError(res, 400, "Executive name is required");
    }

    const active = is_active === false || is_active === 0 || is_active === "0" ? 0 : 1;

    const result = await query(
      `INSERT INTO executives (name, email, phone, is_active)
       VALUES (?, ?, ?, ?)`,
      [String(name).trim(), email || null, phone || null, active],
    );

    const rows = await query("SELECT * FROM executives WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);

    return sendSuccess(res, rows[0], 201);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return sendError(res, 409, "Executive with this name and email already exists");
    }
    console.error("POST /executives error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 400, "Invalid executive id");

    const { name, email, phone, is_active } = req.body || {};

    if (!name || !String(name).trim()) {
      return sendError(res, 400, "Executive name is required");
    }

    const active = is_active === false || is_active === 0 || is_active === "0" ? 0 : 1;

    const result = await query(
      `UPDATE executives
       SET name = ?, email = ?, phone = ?, is_active = ?
       WHERE id = ?`,
      [String(name).trim(), email || null, phone || null, active, id],
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Executive not found");
    }

    const rows = await query("SELECT * FROM executives WHERE id = ? LIMIT 1", [id]);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return sendError(res, 409, "Executive with this name and email already exists");
    }
    console.error("PUT /executives/:id error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 400, "Invalid executive id");

    const quotes = await query(
      "SELECT COUNT(*) AS cnt FROM quotes WHERE executive_id = ?",
      [id],
    );
    if (Number(quotes[0]?.cnt) > 0) {
      return sendError(
        res,
        400,
        "Cannot delete executive assigned to existing quotes",
      );
    }

    const result = await query("DELETE FROM executives WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Executive not found");
    }

    return sendSuccess(res, { id });
  } catch (err) {
    console.error("DELETE /executives/:id error:", err);
    return sendError(res, 500, "Internal server error");
  }
});

module.exports = router;
