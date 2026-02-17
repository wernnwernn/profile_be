// services/authService.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { withConn } = require("./dbService");

const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const register = async ({ email, password, display_name }) => {
  try {
    const emailNorm = String(email || "").trim().toLowerCase();
    if (!emailNorm) throw new Error("กรุณากรอกอีเมล");
    if (!password || String(password).length < 6) throw new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");

    const hash = await bcrypt.hash(String(password), 10);

    return await withConn(async (conn) => {
      const exists = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [emailNorm]);
      if (exists.length > 0) throw new Error("อีเมลนี้ถูกใช้งานแล้ว");

      const res = await conn.query(
        `INSERT INTO users (email, password_hash, display_name, role, is_active)
         VALUES (?, ?, ?, 'user', 1)`,
        [emailNorm, hash, display_name || null]
      );

      const id = Number(res.insertId);
      const rows = await conn.query("SELECT id, email, role, display_name, is_active FROM users WHERE id = ?", [id]);
      const user = rows[0];
      return { user, token: signToken(user) };
    });
  } catch (error) {
    throw new Error("ไม่สามารถสมัครสมาชิกได้: " + error.message);
  }
};

const login = async ({ email, password }) => {
  try {
    const emailNorm = String(email || "").trim().toLowerCase();
    if (!emailNorm) throw new Error("กรุณากรอกอีเมล");
    if (!password) throw new Error("กรุณากรอกรหัสผ่าน");

    return await withConn(async (conn) => {
      const rows = await conn.query(
        "SELECT id, email, password_hash, role, display_name, is_active FROM users WHERE email = ? LIMIT 1",
        [emailNorm]
      );
      if (rows.length === 0) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

      const user = rows[0];
      if (!user.is_active) throw new Error("บัญชีถูกปิดการใช้งาน");

      const ok = await bcrypt.compare(String(password), String(user.password_hash));
      if (!ok) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

      await conn.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

      const safeUser = { id: user.id, email: user.email, role: user.role, display_name: user.display_name };
      return { user: safeUser, token: signToken(safeUser) };
    });
  } catch (error) {
    throw new Error("ไม่สามารถเข้าสู่ระบบได้: " + error.message);
  }
};

module.exports = { register, login, signToken };
