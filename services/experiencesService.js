// services/experiencesService.js
const { withConn, withTx } = require("./dbService");
const { getProfileIdByUserId } = require("./profileContextService");

const _attachHighlights = (experiences, highlights) => {
  const map = new Map();
  experiences.forEach((e) => map.set(Number(e.id), { ...e, highlights: [] }));
  highlights.forEach((h) => {
    const expId = Number(h.experience_id);
    const target = map.get(expId);
    if (target) target.highlights.push(h);
  });
  return Array.from(map.values());
};

const listMyExperiences = async (userId) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) return [];

    return await withConn(async (conn) => {
      const experiences = await conn.query(
        `SELECT * FROM experiences
         WHERE profile_id = ?
         ORDER BY sort_order ASC, start_date DESC, id DESC`,
        [profileId]
      );
      if (experiences.length === 0) return [];
      const expIds = experiences.map((e) => Number(e.id));
      const highlights = await conn.query(
        `SELECT * FROM experience_highlights
         WHERE experience_id IN (${expIds.map(() => "?").join(",")})
         ORDER BY experience_id ASC, sort_order ASC, id ASC`,
        expIds
      );
      return _attachHighlights(experiences, highlights);
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล experiences ได้: " + error.message);
  }
};

const createMyExperience = async (userId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์ กรุณาบันทึกโปรไฟล์ก่อน");

    const company_name = String(payload?.company_name || "").trim();
    const title = String(payload?.title || "").trim();
    const start_date = String(payload?.start_date || "").trim();

    if (!company_name) throw new Error("กรุณากรอก company_name");
    if (!title) throw new Error("กรุณากรอก title");
    if (!start_date) throw new Error("กรุณากรอก start_date");

    const location = payload?.location !== undefined ? String(payload.location || "").trim() : null;
    const end_date = payload?.end_date ? String(payload.end_date) : null;
    const is_current = payload?.is_current ? 1 : 0;
    const description_md = payload?.description_md !== undefined ? String(payload.description_md || "") : null;

    return await withTx(async (conn) => {
      const maxRows = await conn.query("SELECT COALESCE(MAX(sort_order),0) AS mx FROM experiences WHERE profile_id = ?", [profileId]);
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO experiences
         (profile_id, company_name, title, location, start_date, end_date, is_current, description_md, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          profileId,
          company_name,
          title,
          location || null,
          start_date,
          end_date || null,
          is_current,
          description_md || null,
          nextSort,
        ]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM experiences WHERE id = ?", [id]);
      return { ...rows[0], highlights: [] };
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง experience ได้: " + error.message);
  }
};

const updateMyExperience = async (userId, id, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const expId = Number(id);
    if (!Number.isFinite(expId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT * FROM experiences WHERE id = ? AND profile_id = ? LIMIT 1", [expId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ experience");
      const cur = exist[0];

      const next = {
        company_name: payload?.company_name !== undefined ? String(payload.company_name || "").trim() : cur.company_name,
        title: payload?.title !== undefined ? String(payload.title || "").trim() : cur.title,
        location: payload?.location !== undefined ? String(payload.location || "").trim() : cur.location,
        start_date: payload?.start_date !== undefined ? String(payload.start_date || "").trim() : cur.start_date,
        end_date: payload?.end_date !== undefined ? (payload.end_date ? String(payload.end_date) : null) : cur.end_date,
        is_current: payload?.is_current !== undefined ? (payload.is_current ? 1 : 0) : cur.is_current,
        description_md:
          payload?.description_md !== undefined ? (payload.description_md ? String(payload.description_md) : null) : cur.description_md,
      };

      if (!next.company_name) throw new Error("กรุณากรอก company_name");
      if (!next.title) throw new Error("กรุณากรอก title");
      if (!next.start_date) throw new Error("กรุณากรอก start_date");

      await conn.query(
        `UPDATE experiences
         SET company_name = ?, title = ?, location = ?, start_date = ?, end_date = ?,
             is_current = ?, description_md = ?, updated_at = NOW()
         WHERE id = ? AND profile_id = ?`,
        [
          next.company_name,
          next.title,
          next.location || null,
          next.start_date,
          next.end_date || null,
          next.is_current,
          next.description_md || null,
          expId,
          profileId,
        ]
      );

      const rows = await conn.query("SELECT * FROM experiences WHERE id = ?", [expId]);
      const highlights = await conn.query(
        "SELECT * FROM experience_highlights WHERE experience_id = ? ORDER BY sort_order ASC, id ASC",
        [expId]
      );
      return { ...rows[0], highlights };
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข experience ได้: " + error.message);
  }
};

const deleteMyExperience = async (userId, id) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const expId = Number(id);
    if (!Number.isFinite(expId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT id FROM experiences WHERE id = ? AND profile_id = ? LIMIT 1", [expId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ experience");
      await conn.query("DELETE FROM experiences WHERE id = ? AND profile_id = ?", [expId, profileId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ experience ได้: " + error.message);
  }
};

const reorderMyExperiences = async (userId, orderedIds = []) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT id FROM experiences WHERE profile_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [profileId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");
      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE experiences SET sort_order = ?, updated_at = NOW() WHERE id = ? AND profile_id = ?", [i, ids[i], profileId]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ experience ได้: " + error.message);
  }
};

// -------- highlights (ยึด experience_id) --------

const createMyHighlight = async (userId, experienceId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const expId = Number(experienceId);
    if (!Number.isFinite(expId)) throw new Error("experience_id ไม่ถูกต้อง");
    const text = String(payload?.text || "").trim();
    if (!text) throw new Error("กรุณากรอก text");

    return await withTx(async (conn) => {
      const expRows = await conn.query("SELECT id FROM experiences WHERE id = ? AND profile_id = ? LIMIT 1", [expId, profileId]);
      if (expRows.length === 0) throw new Error("ไม่พบ experience");

      const maxRows = await conn.query(
        "SELECT COALESCE(MAX(sort_order),0) AS mx FROM experience_highlights WHERE experience_id = ?",
        [expId]
      );
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO experience_highlights
         (experience_id, text, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [expId, text, nextSort]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM experience_highlights WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง highlight ได้: " + error.message);
  }
};

const updateMyHighlight = async (userId, highlightId, payload) => {
  try {
    const hid = Number(highlightId);
    if (!Number.isFinite(hid)) throw new Error("highlight_id ไม่ถูกต้อง");

    const text = payload?.text !== undefined ? String(payload.text || "").trim() : undefined;

    return await withTx(async (conn) => {
      // verify ownership via join
      const rows = await conn.query(
        `SELECT h.*
         FROM experience_highlights h
         JOIN experiences e ON e.id = h.experience_id
         JOIN profiles p ON p.id = e.profile_id
         WHERE h.id = ? AND p.user_id = ?
         LIMIT 1`,
        [hid, Number(userId)]
      );
      if (rows.length === 0) throw new Error("ไม่พบ highlight");
      const cur = rows[0];
      const nextText = text !== undefined ? text : cur.text;
      if (!nextText) throw new Error("กรุณากรอก text");

      await conn.query("UPDATE experience_highlights SET text = ?, updated_at = NOW() WHERE id = ?", [nextText, hid]);
      const after = await conn.query("SELECT * FROM experience_highlights WHERE id = ?", [hid]);
      return after[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข highlight ได้: " + error.message);
  }
};

const deleteMyHighlight = async (userId, highlightId) => {
  try {
    const hid = Number(highlightId);
    if (!Number.isFinite(hid)) throw new Error("highlight_id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT h.id
         FROM experience_highlights h
         JOIN experiences e ON e.id = h.experience_id
         JOIN profiles p ON p.id = e.profile_id
         WHERE h.id = ? AND p.user_id = ?
         LIMIT 1`,
        [hid, Number(userId)]
      );
      if (rows.length === 0) throw new Error("ไม่พบ highlight");
      await conn.query("DELETE FROM experience_highlights WHERE id = ?", [hid]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ highlight ได้: " + error.message);
  }
};

const reorderMyHighlights = async (userId, experienceId, orderedIds = []) => {
  try {
    const expId = Number(experienceId);
    if (!Number.isFinite(expId)) throw new Error("experience_id ไม่ถูกต้อง");
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      // verify experience ownership
      const expRows = await conn.query(
        `SELECT e.id
         FROM experiences e
         JOIN profiles p ON p.id = e.profile_id
         WHERE e.id = ? AND p.user_id = ?
         LIMIT 1`,
        [expId, Number(userId)]
      );
      if (expRows.length === 0) throw new Error("ไม่พบ experience");

      const rows = await conn.query(
        `SELECT id FROM experience_highlights
         WHERE experience_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [expId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");

      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE experience_highlights SET sort_order = ?, updated_at = NOW() WHERE id = ? AND experience_id = ?", [i, ids[i], expId]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ highlight ได้: " + error.message);
  }
};

module.exports = {
  listMyExperiences,
  createMyExperience,
  updateMyExperience,
  deleteMyExperience,
  reorderMyExperiences,
  createMyHighlight,
  updateMyHighlight,
  deleteMyHighlight,
  reorderMyHighlights,
};
