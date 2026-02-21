// services/educationsService.js
const { withConn, withTx } = require("./dbService");
const { getProfileIdByUserId } = require("./profileContextService");

const listMyEducations = async (userId) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) return [];

    return await withConn(async (conn) => {
      return await conn.query(
        `SELECT * FROM educations
         WHERE profile_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [profileId]
      );
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล educations ได้: " + error.message);
  }
};

const createMyEducation = async (userId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์ กรุณาบันทึกโปรไฟล์ก่อน");

    const school = String(payload?.school || "").trim();
    if (!school) throw new Error("กรุณากรอก school");

    const degree = payload?.degree !== undefined ? String(payload.degree || "").trim() : null;
    const field = payload?.field !== undefined ? String(payload.field || "").trim() : null;
    const start_date = payload?.start_date ? String(payload.start_date) : null;
    const end_date = payload?.end_date ? String(payload.end_date) : null;
    const description_md = payload?.description_md !== undefined ? String(payload.description_md || "") : null;

    return await withTx(async (conn) => {
      const maxRows = await conn.query("SELECT COALESCE(MAX(sort_order),0) AS mx FROM educations WHERE profile_id = ?", [profileId]);
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO educations
         (profile_id, school, degree, field, start_date, end_date, description_md, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [profileId, school, degree || null, field || null, start_date || null, end_date || null, description_md || null, nextSort]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM educations WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง education ได้: " + error.message);
  }
};

const updateMyEducation = async (userId, id, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const eduId = Number(id);
    if (!Number.isFinite(eduId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT * FROM educations WHERE id = ? AND profile_id = ? LIMIT 1", [eduId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ education");
      const cur = exist[0];

      const next = {
        school: payload?.school !== undefined ? String(payload.school || "").trim() : cur.school,
        degree: payload?.degree !== undefined ? String(payload.degree || "").trim() : cur.degree,
        field: payload?.field !== undefined ? String(payload.field || "").trim() : cur.field,
        start_date: payload?.start_date !== undefined ? (payload.start_date ? String(payload.start_date) : null) : cur.start_date,
        end_date: payload?.end_date !== undefined ? (payload.end_date ? String(payload.end_date) : null) : cur.end_date,
        description_md:
          payload?.description_md !== undefined ? (payload.description_md ? String(payload.description_md) : null) : cur.description_md,
      };

      if (!next.school) throw new Error("กรุณากรอก school");

      await conn.query(
        `UPDATE educations
         SET school = ?, degree = ?, field = ?, start_date = ?, end_date = ?, description_md = ?, updated_at = NOW()
         WHERE id = ? AND profile_id = ?`,
        [next.school, next.degree || null, next.field || null, next.start_date || null, next.end_date || null, next.description_md || null, eduId, profileId]
      );
      const rows = await conn.query("SELECT * FROM educations WHERE id = ?", [eduId]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข education ได้: " + error.message);
  }
};

const deleteMyEducation = async (userId, id) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const eduId = Number(id);
    if (!Number.isFinite(eduId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT id FROM educations WHERE id = ? AND profile_id = ? LIMIT 1", [eduId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ education");
      await conn.query("DELETE FROM educations WHERE id = ? AND profile_id = ?", [eduId, profileId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ education ได้: " + error.message);
  }
};

const reorderMyEducations = async (userId, orderedIds = []) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT id FROM educations WHERE profile_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [profileId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");

      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE educations SET sort_order = ?, updated_at = NOW() WHERE id = ? AND profile_id = ?", [i, ids[i], profileId]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ education ได้: " + error.message);
  }
};

module.exports = { listMyEducations, createMyEducation, updateMyEducation, deleteMyEducation, reorderMyEducations };
