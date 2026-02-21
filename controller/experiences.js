// controller/experiences.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/experiencesService");

// -------- experiences --------
router.get("/me/experiences", requireAuth, async (req, res) => {
  try {
    const rows = await service.listMyExperiences(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error("Error list experiences:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/experiences", requireAuth, async (req, res) => {
  try {
    const row = await service.createMyExperience(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create experience:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/experiences/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyExperience(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update experience:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/experiences/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyExperience(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete experience:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/experiences/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMyExperiences(req.user.id, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder experiences:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------- highlights --------
router.post("/me/experience-highlights", requireAuth, async (req, res) => {
  try {
    const row = await service.createMyHighlight(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create highlight:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/experience-highlights/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyHighlight(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update highlight:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/experience-highlights/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyHighlight(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete highlight:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/experience-highlights/reorder", requireAuth, async (req, res) => {
  try {
    const { experience_id, orderedIds } = req.body || {};
    const result = await service.reorderMyHighlights(req.user.id, experience_id, orderedIds || []);
    res.json(result);
  } catch (error) {
    console.error("Error reorder highlights:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
