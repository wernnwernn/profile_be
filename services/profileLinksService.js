// services/profileLinksService.js
const { withConn, withTx } = require("./dbService");
const { getProfileIdByUserId } = require("./profileContextService");

const listMyLinks = async (userId) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) return [];

    return await withConn(async (conn) => {
      const rows = await conn.query(
        `SELECT *
         FROM profile_links
         WHERE profile_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [profileId]
      );
      return rows;
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล profile_links ได้: " + error.message);
  }
};

const createMyLink = async (userId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์ กรุณาบันทึกโปรไฟล์ก่อน");

    const platform = String(payload?.platform || "").trim();
    const url = String(payload?.url || "").trim();
    const label = payload?.label !== undefined ? String(payload.label || "").trim() : null;
    const is_active = payload?.is_active === false ? 0 : 1;

    if (!platform) throw new Error("กรุณากรอก platform");
    if (!url) throw new Error("กรุณากรอก url");

    return await withTx(async (conn) => {
      const maxRows = await conn.query(
        "SELECT COALESCE(MAX(sort_order), 0) AS mx FROM profile_links WHERE profile_id = ?",
        [profileId]
      );
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO profile_links
         (profile_id, platform, label, url, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [profileId, platform, label || null, url, nextSort, is_active]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM profile_links WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง link ได้: " + error.message);
  }
};

const updateMyLink = async (userId, id, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");

    const linkId = Number(id);
    if (!Number.isFinite(linkId)) throw new Error("id ไม่ถูกต้อง");

    const platform = payload?.platform !== undefined ? String(payload.platform || "").trim() : undefined;
    const url = payload?.url !== undefined ? String(payload.url || "").trim() : undefined;
    const label = payload?.label !== undefined ? String(payload.label || "").trim() : undefined;
    const is_active = payload?.is_active !== undefined ? (payload.is_active ? 1 : 0) : undefined;

    return await withTx(async (conn) => {
      const exist = await conn.query(
        "SELECT * FROM profile_links WHERE id = ? AND profile_id = ? LIMIT 1",
        [linkId, profileId]
      );
      if (exist.length === 0) throw new Error("ไม่พบ link");

      const cur = exist[0];
      const next = {
        platform: platform !== undefined ? platform : cur.platform,
        url: url !== undefined ? url : cur.url,
        label: label !== undefined ? (label || null) : cur.label,
        is_active: is_active !== undefined ? is_active : cur.is_active,
      };

      if (!next.platform) throw new Error("กรุณากรอก platform");
      if (!next.url) throw new Error("กรุณากรอก url");

      await conn.query(
        `UPDATE profile_links
         SET platform = ?, label = ?, url = ?, is_active = ?, updated_at = NOW()
         WHERE id = ? AND profile_id = ?`,
        [next.platform, next.label, next.url, next.is_active, linkId, profileId]
      );

      const rows = await conn.query("SELECT * FROM profile_links WHERE id = ?", [linkId]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข link ได้: " + error.message);
  }
};

const deleteMyLink = async (userId, id) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");

    const linkId = Number(id);
    if (!Number.isFinite(linkId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query(
        "SELECT id FROM profile_links WHERE id = ? AND profile_id = ? LIMIT 1",
        [linkId, profileId]
      );
      if (exist.length === 0) throw new Error("ไม่พบ link");

      await conn.query("DELETE FROM profile_links WHERE id = ? AND profile_id = ?", [linkId, profileId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ link ได้: " + error.message);
  }
};

const reorderMyLinks = async (userId, orderedIds = []) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");

    const ids = Array.isArray(orderedIds) ? orderedIds.map((x) => Number(x)).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      // verify ownership
      const rows = await conn.query(
        `SELECT id FROM profile_links WHERE profile_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [profileId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");

      for (let i = 0; i < ids.length; i++) {
        await conn.query(
          "UPDATE profile_links SET sort_order = ?, updated_at = NOW() WHERE id = ? AND profile_id = ?",
          [i, ids[i], profileId]
        );
      }

      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ link ได้: " + error.message);
  }
};

module.exports = {
  listMyLinks,
  createMyLink,
  updateMyLink,
  deleteMyLink,
  reorderMyLinks,
};
