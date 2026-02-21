// services/tagsService.js
const { withConn, withTx } = require("./dbService");

const slugify = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/g, "")
    .replace(/-$/g, "")
    .slice(0, 120);

const listTags = async () => {
  try {
    return await withConn(async (conn) => {
      return await conn.query("SELECT * FROM tags ORDER BY name ASC, id ASC");
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล tags ได้: " + error.message);
  }
};

const createTag = async (payload) => {
  try {
    const name = String(payload?.name || "").trim();
    if (!name) throw new Error("กรุณากรอก name");
    const slug = payload?.slug ? slugify(payload.slug) : slugify(name);
    if (!slug) throw new Error("slug ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const res = await conn.query(
        `INSERT INTO tags (name, slug, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [name, slug]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM tags WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง tag ได้: " + error.message);
  }
};

const updateTag = async (id, payload) => {
  try {
    const tagId = Number(id);
    if (!Number.isFinite(tagId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT * FROM tags WHERE id = ? LIMIT 1", [tagId]);
      if (exist.length === 0) throw new Error("ไม่พบ tag");
      const cur = exist[0];

      const name = payload?.name !== undefined ? String(payload.name || "").trim() : cur.name;
      const slug = payload?.slug !== undefined ? slugify(payload.slug) : cur.slug;
      if (!name) throw new Error("กรุณากรอก name");
      if (!slug) throw new Error("slug ไม่ถูกต้อง");

      await conn.query("UPDATE tags SET name = ?, slug = ?, updated_at = NOW() WHERE id = ?", [name, slug, tagId]);
      const rows = await conn.query("SELECT * FROM tags WHERE id = ?", [tagId]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข tag ได้: " + error.message);
  }
};

const deleteTag = async (id) => {
  try {
    const tagId = Number(id);
    if (!Number.isFinite(tagId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const used = await conn.query("SELECT 1 FROM project_tags WHERE tag_id = ? LIMIT 1", [tagId]);
      if (used.length > 0) throw new Error("tag ถูกใช้งานอยู่ ไม่สามารถลบได้");

      await conn.query("DELETE FROM tags WHERE id = ?", [tagId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ tag ได้: " + error.message);
  }
};

module.exports = { listTags, createTag, updateTag, deleteTag };
