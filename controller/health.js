// controller/seven_knight.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mariaPool");

router.get("/health", async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT 1 AS ok");
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ message: "db error", error: String(e) });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
