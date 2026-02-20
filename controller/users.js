const express = require("express");
const router = express.Router();
const requireAdmin = require("../middlewares/requireAdmin");
const usersService = require("../services/usersService");

router.get("/users", requireAdmin, async (req, res) => {
    try {
        const result = await usersService.getAllUsers();
        res.json(result);
    } catch (error) {
        console.error("Error get users:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/users", requireAdmin, async (req, res) => {
    try {
        const result = await usersService.createUser(req.body);
        res.json(result);
    } catch (error) {
        console.error("Error create user:", error);
        res.status(500).json({ error: error.message });
    }
});

router.put("/users/:id", requireAdmin, async (req, res) => {
    try {
        const result = await usersService.updateUser(Number(req.params.id), req.body);
        res.json(result);
    } catch (error) {
        console.error("Error update user:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
