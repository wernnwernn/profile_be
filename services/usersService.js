const { withConn } = require("./dbService");
const bcrypt = require("bcryptjs");

const getAllUsers = async () => {
    return await withConn(async (conn) => {
        const rows = await conn.query("SELECT id, email, username, role, is_active, last_login_at, created_at FROM users ORDER BY id DESC");
        return rows;
    });
};

const createUser = async ({ email, username, password, role }) => {
    const emailNorm = String(email || "").trim().toLowerCase();
    const userNorm = String(username || "").trim();
    const roleNorm = role === "admin" ? "admin" : "user";

    if (!emailNorm || !userNorm || !password) throw new Error("ข้อมูลไม่ครบถ้วน");

    const hash = await bcrypt.hash(String(password), 10);

    return await withConn(async (conn) => {
        const emailExists = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [emailNorm]);
        if (emailExists.length > 0) throw new Error("อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว");

        const userExists = await conn.query("SELECT id FROM users WHERE username = ? LIMIT 1", [userNorm]);
        if (userExists.length > 0) throw new Error("username นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว");

        const res = await conn.query(
            "INSERT INTO users (email, password_hash, username, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())",
            [emailNorm, hash, userNorm, roleNorm]
        );

        return { id: Number(res.insertId) };
    });
};

const updateUser = async (id, { email, username, role, is_active, password }) => {
    const emailNorm = String(email || "").trim().toLowerCase();
    const userNorm = String(username || "").trim();
    const roleNorm = role === "admin" ? "admin" : "user";
    const activeMark = is_active ? 1 : 0;

    if (!emailNorm || !userNorm) throw new Error("ข้อมูลไม่ครบถ้วน");

    return await withConn(async (conn) => {
        const duplicate = await conn.query(
            "SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ? LIMIT 1",
            [emailNorm, userNorm, id]
        );
        if (duplicate.length > 0) throw new Error("อีเมลหรือ username นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว");

        let query = "UPDATE users SET email = ?, username = ?, role = ?, is_active = ?, updated_at = NOW()";
        let params = [emailNorm, userNorm, roleNorm, activeMark];

        if (password && String(password).length >= 6) {
            const hash = await bcrypt.hash(String(password), 10);
            query += ", password_hash = ?";
            params.push(hash);
        }

        query += " WHERE id = ?";
        params.push(id);

        await conn.query(query, params);

        return { ok: true };
    });
};

module.exports = { getAllUsers, createUser, updateUser };
