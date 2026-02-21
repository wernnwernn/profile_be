// services/certificatesService.js
const { withConn, withTx } = require("./dbService");
const { getProfileIdByUserId } = require("./profileContextService");

const listMyCertificates = async (userId) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) return [];

    return await withConn(async (conn) => {
      return await conn.query(
        `SELECT * FROM certificates
         WHERE profile_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [profileId]
      );
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล certificates ได้: " + error.message);
  }
};

const createMyCertificate = async (userId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์ กรุณาบันทึกโปรไฟล์ก่อน");

    const name = String(payload?.name || "").trim();
    if (!name) throw new Error("กรุณากรอก name");

    const issuer = payload?.issuer !== undefined ? String(payload.issuer || "").trim() : null;
    const issue_date = payload?.issue_date ? String(payload.issue_date) : null;
    const credential_url = payload?.credential_url !== undefined ? String(payload.credential_url || "").trim() : null;
    const media_id = payload?.media_id !== undefined && payload.media_id !== null && payload.media_id !== "" ? Number(payload.media_id) : null;

    return await withTx(async (conn) => {
      const maxRows = await conn.query("SELECT COALESCE(MAX(sort_order),0) AS mx FROM certificates WHERE profile_id = ?", [profileId]);
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO certificates
         (profile_id, name, issuer, issue_date, credential_url, media_id, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [profileId, name, issuer || null, issue_date || null, credential_url || null, Number.isFinite(media_id) ? media_id : null, nextSort]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM certificates WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง certificate ได้: " + error.message);
  }
};

const updateMyCertificate = async (userId, id, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const certId = Number(id);
    if (!Number.isFinite(certId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT * FROM certificates WHERE id = ? AND profile_id = ? LIMIT 1", [certId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ certificate");
      const cur = exist[0];

      const next = {
        name: payload?.name !== undefined ? String(payload.name || "").trim() : cur.name,
        issuer: payload?.issuer !== undefined ? String(payload.issuer || "").trim() : cur.issuer,
        issue_date: payload?.issue_date !== undefined ? (payload.issue_date ? String(payload.issue_date) : null) : cur.issue_date,
        credential_url:
          payload?.credential_url !== undefined ? String(payload.credential_url || "").trim() : cur.credential_url,
        media_id:
          payload?.media_id !== undefined
            ? (payload.media_id === null || payload.media_id === "" ? null : Number(payload.media_id))
            : cur.media_id,
      };
      if (!next.name) throw new Error("กรุณากรอก name");

      await conn.query(
        `UPDATE certificates
         SET name = ?, issuer = ?, issue_date = ?, credential_url = ?, media_id = ?, updated_at = NOW()
         WHERE id = ? AND profile_id = ?`,
        [
          next.name,
          next.issuer || null,
          next.issue_date || null,
          next.credential_url || null,
          Number.isFinite(next.media_id) ? next.media_id : null,
          certId,
          profileId,
        ]
      );
      const rows = await conn.query("SELECT * FROM certificates WHERE id = ?", [certId]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข certificate ได้: " + error.message);
  }
};

const deleteMyCertificate = async (userId, id) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const certId = Number(id);
    if (!Number.isFinite(certId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT id FROM certificates WHERE id = ? AND profile_id = ? LIMIT 1", [certId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ certificate");
      await conn.query("DELETE FROM certificates WHERE id = ? AND profile_id = ?", [certId, profileId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ certificate ได้: " + error.message);
  }
};

const reorderMyCertificates = async (userId, orderedIds = []) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT id FROM certificates WHERE profile_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [profileId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");

      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE certificates SET sort_order = ?, updated_at = NOW() WHERE id = ? AND profile_id = ?", [i, ids[i], profileId]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ certificate ได้: " + error.message);
  }
};

module.exports = { listMyCertificates, createMyCertificate, updateMyCertificate, deleteMyCertificate, reorderMyCertificates };
