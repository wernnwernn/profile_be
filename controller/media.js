// controller/media.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const requireAuth = require("../middlewares/requireAuth");
const mediaService = require("../services/mediaService");

const maxMb = Number(process.env.UPLOAD_MAX_MB || 5);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 },
});

router.post("/media", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "กรุณาแนบไฟล์" });

    const result = await mediaService.createMedia({
      buffer: f.buffer,
      original_name: f.originalname,
      mime_type: f.mimetype,
      size_bytes: f.size,
      width: null,
      height: null,
      alt_text: req.body?.alt_text || null,
    });

    res.json(result);
  } catch (error) {
    console.error("Error upload media:", error);
    res.status(500).json({ error: error.message });
  }
});

// list (admin)
router.get("/media", requireAuth, async (req, res) => {
  try {
    const q = req.query?.q;
    const limit = req.query?.limit;
    const offset = req.query?.offset;
    const rows = await mediaService.listMediaMeta({ q, limit, offset });
    res.json(rows);
  } catch (error) {
    console.error("Error list media:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/media/:id/meta", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const meta = await mediaService.getMediaMeta(id);
    if (!meta) return res.status(404).json({ error: "ไม่พบไฟล์" });
    res.json(meta);
  } catch (error) {
    console.error("Error get media meta:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/media/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const file = await mediaService.getMediaBinary(id);
    if (!file) return res.status(404).json({ error: "ไม่พบไฟล์" });

    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Content-Length", String(file.size_bytes || file.data?.length || 0));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(file.data);
  } catch (error) {
    console.error("Error get media:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/media/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await mediaService.deleteMedia(id);
    res.json(result);
  } catch (error) {
    console.error("Error delete media:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
