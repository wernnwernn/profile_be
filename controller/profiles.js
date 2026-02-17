// controller/profiles.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const profileService = require("../services/profileService");

router.get("/me/profile", requireAuth, async (req, res) => {
  try {
    const profile = await profileService.getMyProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    console.error("Error get my profile:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/profile", requireAuth, async (req, res) => {
  try {
    const ctx = {
      ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
      user_agent: req.headers["user-agent"] || null,
      request_id: req.requestId || null,
    };

    const profile = await profileService.upsertMyProfile(req.user.id, req.body || {}, ctx);
    res.json(profile);
  } catch (error) {
    console.error("Error upsert my profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// public
router.get("/public/profiles/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const profile = await profileService.getPublicProfileBySlug(slug);
    if (!profile) return res.status(404).json({ error: "ไม่พบโปรไฟล์" });
    res.json(profile);
  } catch (error) {
    console.error("Error get public profile:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/public/profiles/:slug/full", async (req, res) => {
  try {
    const slug = req.params.slug;
    const result = await profileService.getPublicProfileFullBySlug(slug);
    if (!result) return res.status(404).json({ error: "ไม่พบโปรไฟล์" });
    res.json(result);
  } catch (error) {
    console.error("Error get public profile full:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
