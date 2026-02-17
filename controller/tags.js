// controller/tags.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/tagsService");

router.get("/me/tags", requireAuth, async (req, res) => {
  try {
    const rows = await service.listTags();
    res.json(rows);
  } catch (error) {
    console.error("Error list tags:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/tags", requireAuth, async (req, res) => {
  try {
    const row = await service.createTag(req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create tag:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/tags/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateTag(req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update tag:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/tags/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteTag(req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete tag:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
