// controller/skills.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/skillsService");

router.get("/me/skills", requireAuth, async (req, res) => {
  try {
    const rows = await service.listMySkills(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error("Error list skills:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/skills", requireAuth, async (req, res) => {
  try {
    const row = await service.createMySkill(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create skill:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/skills/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMySkill(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update skill:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/skills/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMySkill(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete skill:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/skills/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMySkills(req.user.id, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder skills:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
