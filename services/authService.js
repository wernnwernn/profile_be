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

const register = async ({ email, password, username }) => {
  try {
    const emailNorm = String(email || "").trim().toLowerCase();
    const userNorm = String(username || "").trim();
    if (!emailNorm) throw new Error("กรุณากรอกอีเมล");
    if (!userNorm) throw new Error("กรุณากรอก username");
    if (!password || String(password).length < 6) throw new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");

    const hash = await bcrypt.hash(String(password), 10);

    return await withConn(async (conn) => {
      const emailExists = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [emailNorm]);
      if (emailExists.length > 0) throw new Error("อีเมลนี้ถูกใช้งานแล้ว");

      const userExists = await conn.query("SELECT id FROM users WHERE username = ? LIMIT 1", [userNorm]);
      if (userExists.length > 0) throw new Error("username นี้ถูกใช้งานแล้ว");

      const res = await conn.query(
        `INSERT INTO users (email, password_hash, username, role, is_active)
         VALUES (?, ?, ?, 'user', 1)`,
        [emailNorm, hash, userNorm]
      );

      const id = Number(res.insertId);
      const rows = await conn.query("SELECT id, email, role, username, is_active FROM users WHERE id = ?", [id]);
      const user = rows[0];
      return { user, token: signToken(user) };
    });
  } catch (error) {
    throw new Error("ไม่สามารถสมัครสมาชิกได้: " + error.message);
  }
};

const login = async ({ username, password }) => {
  try {
    const userNorm = String(username || "").trim();
    if (!userNorm) throw new Error("กรุณากรอก username");
    if (!password) throw new Error("กรุณากรอกรหัสผ่าน");

    return await withConn(async (conn) => {
      const rows = await conn.query(
        "SELECT id, email, password_hash, role, username, is_active FROM users WHERE username = ? LIMIT 1",
        [userNorm]
      );
      if (rows.length === 0) throw new Error("username หรือรหัสผ่านไม่ถูกต้อง");

      const user = rows[0];
      if (!user.is_active) throw new Error("บัญชีถูกปิดการใช้งาน");

      const ok = await bcrypt.compare(String(password), String(user.password_hash));
      if (!ok) throw new Error("username หรือรหัสผ่านไม่ถูกต้อง");

      await conn.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

      const safeUser = { id: user.id, email: user.email, role: user.role, username: user.username };
      return { user: safeUser, token: signToken(safeUser) };
    });
  } catch (error) {
    throw new Error("ไม่สามารถเข้าสู่ระบบได้: " + error.message);
  }
};

module.exports = { register, login, signToken };
