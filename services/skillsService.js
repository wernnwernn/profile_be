// services/skillsService.js
const { withConn, withTx } = require("./dbService");
const { getProfileIdByUserId } = require("./profileContextService");

const listMySkills = async (userId) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) return [];

    return await withConn(async (conn) => {
      return await conn.query(
        `SELECT * FROM skills
         WHERE profile_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [profileId]
      );
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล skills ได้: " + error.message);
  }
};

const createMySkill = async (userId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์ กรุณาบันทึกโปรไฟล์ก่อน");

    const name = String(payload?.name || "").trim();
    const category = payload?.category !== undefined ? String(payload.category || "").trim() : null;
    const is_active = payload?.is_active === false ? 0 : 1;
    
    if (!name) throw new Error("กรุณากรอก name");

    return await withTx(async (conn) => {
      const maxRows = await conn.query(
        "SELECT COALESCE(MAX(sort_order), 0) AS mx FROM skills WHERE profile_id = ?",
        [profileId]
      );
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO skills
         (profile_id, name, category, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [profileId, name, category || null, nextSort, is_active]
      );
      
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM skills WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง skill ได้: " + error.message);
  }
};

const updateMySkill = async (userId, id, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");

    const skillId = Number(id);
    if (!Number.isFinite(skillId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query(
        "SELECT * FROM skills WHERE id = ? AND profile_id = ? LIMIT 1",
        [skillId, profileId]
      );
      if (exist.length === 0) throw new Error("ไม่พบ skill");
      const cur = exist[0];

      const next = {
        name: payload?.name !== undefined ? String(payload.name || "").trim() : cur.name,
        category: payload?.category !== undefined ? String(payload.category || "").trim() : cur.category,
        is_active: payload?.is_active !== undefined ? (payload.is_active ? 1 : 0) : cur.is_active,
      };

      if (!next.name) throw new Error("กรุณากรอก name");

      await conn.query(
        `UPDATE skills
         SET name = ?, category = ?, is_active = ?, updated_at = NOW()
         WHERE id = ? AND profile_id = ?`,
        [next.name, next.category || null, next.is_active, skillId, profileId]
      );

      const rows = await conn.query("SELECT * FROM skills WHERE id = ?", [skillId]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข skill ได้: " + error.message);
  }
};

const deleteMySkill = async (userId, id) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");

    const skillId = Number(id);
    if (!Number.isFinite(skillId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT id FROM skills WHERE id = ? AND profile_id = ? LIMIT 1", [skillId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ skill");
      await conn.query("DELETE FROM skills WHERE id = ? AND profile_id = ?", [skillId, profileId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ skill ได้: " + error.message);
  }
};

const reorderMySkills = async (userId, orderedIds = []) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");

    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT id FROM skills WHERE profile_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [profileId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");

      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE skills SET sort_order = ?, updated_at = NOW() WHERE id = ? AND profile_id = ?", [i, ids[i], profileId]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ skill ได้: " + error.message);
  }
};

module.exports = { listMySkills, createMySkill, updateMySkill, deleteMySkill, reorderMySkills };
