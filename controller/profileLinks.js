// controller/profileLinks.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/profileLinksService");

router.get("/me/profile-links", requireAuth, async (req, res) => {
  try {
    const rows = await service.listMyLinks(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error("Error list profile-links:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/profile-links", requireAuth, async (req, res) => {
  try {
    const row = await service.createMyLink(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create profile-link:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/profile-links/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyLink(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update profile-link:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/profile-links/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyLink(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete profile-link:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/profile-links/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMyLinks(req.user.id, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder profile-links:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
