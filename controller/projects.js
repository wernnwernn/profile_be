// controller/projects.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/projectsService");

router.get("/me/projects", requireAuth, async (req, res) => {
  try {
    const rows = await service.listMyProjects(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error("Error list projects:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/projects", requireAuth, async (req, res) => {
  try {
    const row = await service.createMyProject(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/projects/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyProject(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/projects/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyProject(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/projects/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMyProjects(req.user.id, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder projects:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------- project media --------
router.post("/me/projects/:projectId/media", requireAuth, async (req, res) => {
  try {
    const row = await service.addMyProjectMedia(req.user.id, req.params.projectId, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error add project media:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/project-media/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyProjectMedia(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update project media:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/project-media/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyProjectMedia(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete project media:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/projects/:projectId/media/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMyProjectMedias(req.user.id, req.params.projectId, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder project media:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------- project tags --------
router.post("/me/projects/:projectId/tags", requireAuth, async (req, res) => {
  try {
    const tagIds = req.body?.tagIds || req.body?.ids || [];
    const result = await service.setMyProjectTags(req.user.id, req.params.projectId, tagIds);
    res.json(result);
  } catch (error) {
    console.error("Error set project tags:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
