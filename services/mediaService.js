// services/mediaService.js
const { withConn } = require("./dbService");

const createMedia = async ({ buffer, original_name, mime_type, size_bytes, width, height, alt_text }) => {
  try {
    if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("ไฟล์ไม่ถูกต้อง");
    if (!mime_type) throw new Error("ไม่พบ mime_type");

    const id = await withConn(async (conn) => {
      const res = await conn.query(
        `INSERT INTO media (data, original_name, mime_type, size_bytes, width, height, alt_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [buffer, original_name, mime_type, Number(size_bytes || buffer.length), width || null, height || null, alt_text || null]
      );
      return Number(res.insertId);
    });

    return { id };
  } catch (error) {
    throw new Error("ไม่สามารถบันทึกไฟล์ได้: " + error.message);
  }
};

const getMediaMeta = async (id) => {
  try {
    return await withConn(async (conn) => {
      const rows = await conn.query(
        `SELECT id, original_name, mime_type, size_bytes, width, height, alt_text, created_at, updated_at
         FROM media WHERE id = ?`,
        [Number(id)]
      );
      return rows[0] || null;
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล media ได้: " + error.message);
  }
};

const getMediaBinary = async (id) => {
  try {
    return await withConn(async (conn) => {
      const rows = await conn.query(
        `SELECT id, data, mime_type, size_bytes, original_name
         FROM media WHERE id = ?`,
        [Number(id)]
      );
      return rows[0] || null;
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงไฟล์ได้: " + error.message);
  }
};

const listMediaMeta = async ({ q, limit = 50, offset = 0 } = {}) => {
  try {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const off = Math.max(Number(offset) || 0, 0);
    const keyword = String(q || "").trim();

    return await withConn(async (conn) => {
      if (keyword) {
        const like = `%${keyword}%`;
        const rows = await conn.query(
          `SELECT id, original_name, mime_type, size_bytes, width, height, alt_text, created_at, updated_at
           FROM media
           WHERE original_name LIKE ? OR mime_type LIKE ?
           ORDER BY id DESC
           LIMIT ? OFFSET ?`,
          [like, like, lim, off]
        );
        return rows;
      }

      const rows = await conn.query(
        `SELECT id, original_name, mime_type, size_bytes, width, height, alt_text, created_at, updated_at
         FROM media
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [lim, off]
      );
      return rows;
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงรายการ media ได้: " + error.message);
  }
};

const deleteMedia = async (id) => {
  try {
    const mid = Number(id);
    if (!Number.isFinite(mid)) throw new Error("id ไม่ถูกต้อง");
    return await withConn(async (conn) => {
      // กันลบกรณีถูกใช้งานอยู่
      const used1 = await conn.query("SELECT 1 FROM profiles WHERE avatar_media_id = ? OR resume_media_id = ? LIMIT 1", [mid, mid]);
      if (used1.length > 0) throw new Error("media ถูกใช้งานอยู่ใน profiles");
      const used2 = await conn.query("SELECT 1 FROM certificates WHERE media_id = ? LIMIT 1", [mid]);
      if (used2.length > 0) throw new Error("media ถูกใช้งานอยู่ใน certificates");
      const used3 = await conn.query("SELECT 1 FROM projects WHERE cover_media_id = ? LIMIT 1", [mid]);
      if (used3.length > 0) throw new Error("media ถูกใช้งานอยู่ใน projects");
      const used4 = await conn.query("SELECT 1 FROM project_media WHERE media_id = ? LIMIT 1", [mid]);
      if (used4.length > 0) throw new Error("media ถูกใช้งานอยู่ใน project_media");

      await conn.query("DELETE FROM media WHERE id = ?", [mid]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ media ได้: " + error.message);
  }
};

module.exports = { createMedia, getMediaMeta, getMediaBinary, listMediaMeta, deleteMedia };
