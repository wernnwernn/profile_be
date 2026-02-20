const { withConn } = require("./dbService");
const { USER_ROLE_MEDIA_LIMIT } = require("../config/appConfig");

const mediaCache = new Map();

const normalizeRow = (r) => {
  if (!r) return r;

  const toNum = (v) => (typeof v === "bigint" ? Number(v) : v);

  return {
    ...r,
    // BIGINT มักจะเจอที่ size_bytes (และบาง driver อาจคืน bigint ให้ field อื่นด้วย)
    size_bytes: toNum(r.size_bytes),
    width: toNum(r.width),
    height: toNum(r.height),

    // บางที id ก็อาจโดน bigint ได้ในบาง config
    id: toNum(r.id),
  };
};

const normalizeRows = (rows) => (Array.isArray(rows) ? rows.map(normalizeRow) : rows);

const createMedia = async ({ buffer, original_name, mime_type, size_bytes, width, height, alt_text, user }) => {
  try {
    if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("ไฟล์ไม่ถูกต้อง");
    if (!mime_type) throw new Error("ไม่พบ mime_type");

    return await withConn(async (conn) => {
      // Check limits if role is "user"
      if (user && user.role === "user") {
        const userId = Number(user.id);
        const countRows = await conn.query("SELECT COUNT(*) as total FROM media WHERE user_id = ?", [userId]);
        const total = countRows[0] ? Number(countRows[0].total) : 0;

        if (total >= USER_ROLE_MEDIA_LIMIT) {
          throw new Error(`คุณสามารถอัปโหลดไฟล์ได้สูงสุด ${USER_ROLE_MEDIA_LIMIT} ไฟล์เท่านั้น (ข้อจำกัดสำหรับ role user)`);
        }
      }

      const res = await conn.query(
        `INSERT INTO media (data, original_name, mime_type, size_bytes, width, height, alt_text, user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          buffer,
          original_name,
          mime_type,
          Number(size_bytes || buffer.length),
          width || null,
          height || null,
          alt_text || null,
          user ? Number(user.id) : null,
        ]
      );
      return { id: Number(res.insertId) };
    });
  } catch (error) {
    throw new Error("ไม่สามารถบันทึกไฟล์ได้: " + error.message);
  }
};

const getMediaMeta = async (id) => {
  try {
    return await withConn(async (conn) => {
      const rows = await conn.query(
        `SELECT id, original_name, mime_type, size_bytes, width, height, alt_text, created_at, updated_at
         FROM media
         WHERE id = ?`,
        [Number(id)]
      );
      return normalizeRow(rows[0] || null);
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล media ได้: " + error.message);
  }
};

const getMediaBinary = async (id) => {
  try {
    const cacheKey = `media_${id}`;
    if (mediaCache.has(cacheKey)) {
      return mediaCache.get(cacheKey);
    }
    return await withConn(async (conn) => {
      const rows = await conn.query(
        `SELECT id, data, mime_type, size_bytes, original_name
         FROM media
         WHERE id = ?`,
        [Number(id)]
      );
      const file = normalizeRow(rows[0] || null);
      if (file) {
        if (mediaCache.size > 200) {
          const firstKey = mediaCache.keys().next().value;
          mediaCache.delete(firstKey);
        }
        mediaCache.set(cacheKey, file);
      }
      return file;
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
        return normalizeRows(rows);
      }

      const rows = await conn.query(
        `SELECT id, original_name, mime_type, size_bytes, width, height, alt_text, created_at, updated_at
         FROM media
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [lim, off]
      );
      return normalizeRows(rows);
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
      const used1 = await conn.query(
        "SELECT 1 FROM profiles WHERE avatar_media_id = ? OR resume_media_id = ? LIMIT 1",
        [mid, mid]
      );
      if (used1.length > 0) throw new Error("media ถูกใช้งานอยู่ใน profiles");

      const used2 = await conn.query("SELECT 1 FROM certificates WHERE media_id = ? LIMIT 1", [mid]);
      if (used2.length > 0) throw new Error("media ถูกใช้งานอยู่ใน certificates");

      const used3 = await conn.query("SELECT 1 FROM projects WHERE cover_media_id = ? LIMIT 1", [mid]);
      if (used3.length > 0) throw new Error("media ถูกใช้งานอยู่ใน projects");

      const used4 = await conn.query("SELECT 1 FROM project_media WHERE media_id = ? LIMIT 1", [mid]);
      if (used4.length > 0) throw new Error("media ถูกใช้งานอยู่ใน project_media");

      await conn.query("DELETE FROM media WHERE id = ?", [mid]);
      mediaCache.delete(`media_${mid}`);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ media ได้: " + error.message);
  }
};

const clearMediaCache = async () => {
  mediaCache.clear();
  return { ok: true, message: "Media cache cleared" };
};

module.exports = {
  createMedia,
  getMediaMeta,
  getMediaBinary,
  listMediaMeta,
  deleteMedia,
  clearMediaCache,
};
