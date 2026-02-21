// controller/certificates.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const service = require("../services/certificatesService");

router.get("/me/certificates", requireAuth, async (req, res) => {
  try {
    const rows = await service.listMyCertificates(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error("Error list certificates:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/certificates", requireAuth, async (req, res) => {
  try {
    const row = await service.createMyCertificate(req.user.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error create certificate:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/certificates/:id", requireAuth, async (req, res) => {
  try {
    const row = await service.updateMyCertificate(req.user.id, req.params.id, req.body);
    res.json(row);
  } catch (error) {
    console.error("Error update certificate:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/certificates/:id", requireAuth, async (req, res) => {
  try {
    const result = await service.deleteMyCertificate(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Error delete certificate:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/certificates/reorder", requireAuth, async (req, res) => {
  try {
    const ids = req.body?.orderedIds || req.body;
    const result = await service.reorderMyCertificates(req.user.id, ids);
    res.json(result);
  } catch (error) {
    console.error("Error reorder certificates:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
