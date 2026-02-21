// controller/educations.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/educationsService");

router.get("/me/educations", requireAuth, async (req, res) => {
  try {
    const rows = await service.listMyEducations(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error("Error list educations:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/educations", requireAuth, async (req, res) => {
  try {
    const row = await service.createMyEducation(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create education:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/educations/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyEducation(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update education:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/educations/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyEducation(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete education:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/educations/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMyEducations(req.user.id, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder educations:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
