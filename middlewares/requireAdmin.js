const requireAuth = require("./requireAuth");

const requireAdmin = (req, res, next) => {
    requireAuth(req, res, () => {
        if (req.user && req.user.role === "admin") {
            next();
        } else {
            res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึง (Admin only)" });
        }
    });
};

module.exports = requireAdmin;
