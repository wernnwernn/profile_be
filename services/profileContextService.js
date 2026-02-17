// services/profileContextService.js
// ใช้ร่วมกันทุกโมดูล: หา profile_id ของผู้ใช้

const { withConn } = require("./dbService");

const getProfileIdByUserId = async (userId) => {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) throw new Error("user_id ไม่ถูกต้อง");

  return await withConn(async (conn) => {
    const rows = await conn.query("SELECT id FROM profiles WHERE user_id = ? LIMIT 1", [uid]);
    return rows[0]?.id ? Number(rows[0].id) : null;
  });
};

module.exports = { getProfileIdByUserId };
