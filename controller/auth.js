// controller/auth.js
const express = require("express");
const router = express.Router();
const authService = require("../services/authService");

router.post("/auth/register", async (req, res) => {
  try {
    const result = await authService.register(req.body || {});
    res.json(result);
  } catch (error) {
    console.error("Error register:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const result = await authService.login(req.body || {});
    res.json(result);
  } catch (error) {
    console.error("Error login:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
