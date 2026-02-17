// services/projectsService.js
const { withConn, withTx } = require("./dbService");
const { getProfileIdByUserId } = require("./profileContextService");

const _combineProjects = (projects, medias, tags) => {
  const map = new Map();
  projects.forEach((p) => map.set(Number(p.id), { ...p, medias: [], tags: [] }));
  medias.forEach((m) => {
    const pid = Number(m.project_id);
    const t = map.get(pid);
    if (t) t.medias.push(m);
  });
  tags.forEach((t) => {
    const pid = Number(t.project_id);
    const target = map.get(pid);
    if (target) target.tags.push({ id: t.tag_id, name: t.name, slug: t.slug });
  });
  return Array.from(map.values());
};

const listMyProjects = async (userId) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) return [];

    return await withConn(async (conn) => {
      const projects = await conn.query(
        `SELECT * FROM projects
         WHERE profile_id = ?
         ORDER BY sort_order ASC, id DESC`,
        [profileId]
      );
      if (projects.length === 0) return [];
      const ids = projects.map((p) => Number(p.id));

      const medias = await conn.query(
        `SELECT pm.id, pm.project_id, pm.media_id, pm.caption, pm.sort_order, pm.created_at, pm.updated_at
         FROM project_media pm
         WHERE pm.project_id IN (${ids.map(() => "?").join(",")})
         ORDER BY pm.project_id ASC, pm.sort_order ASC, pm.id ASC`,
        ids
      );

      const tags = await conn.query(
        `SELECT pt.project_id, t.id AS tag_id, t.name, t.slug
         FROM project_tags pt
         JOIN tags t ON t.id = pt.tag_id
         WHERE pt.project_id IN (${ids.map(() => "?").join(",")})
         ORDER BY pt.project_id ASC, t.name ASC`,
        ids
      );

      return _combineProjects(projects, medias, tags);
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูล projects ได้: " + error.message);
  }
};

const createMyProject = async (userId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์ กรุณาบันทึกโปรไฟล์ก่อน");

    const slug = String(payload?.slug || "").trim();
    const title = String(payload?.title || "").trim();
    if (!slug) throw new Error("กรุณากรอก slug");
    if (!title) throw new Error("กรุณากรอก title");

    const summary = payload?.summary !== undefined ? String(payload.summary || "").trim() : null;
    const description_md = payload?.description_md !== undefined ? String(payload.description_md || "") : null;
    const role = payload?.role !== undefined ? String(payload.role || "").trim() : null;
    const tech_stack_json = payload?.tech_stack_json !== undefined ? payload.tech_stack_json : null;
    const start_date = payload?.start_date ? String(payload.start_date) : null;
    const end_date = payload?.end_date ? String(payload.end_date) : null;
    const status = payload?.status ? String(payload.status) : "draft";
    const is_featured = payload?.is_featured ? 1 : 0;
    const cover_media_id = payload?.cover_media_id !== undefined && payload.cover_media_id !== null && payload.cover_media_id !== "" ? Number(payload.cover_media_id) : null;
    const demo_url = payload?.demo_url !== undefined ? String(payload.demo_url || "").trim() : null;
    const repo_url = payload?.repo_url !== undefined ? String(payload.repo_url || "").trim() : null;

    const validStatus = new Set(["active", "completed", "draft"]);
    if (!validStatus.has(status)) throw new Error("status ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const maxRows = await conn.query("SELECT COALESCE(MAX(sort_order),0) AS mx FROM projects WHERE profile_id = ?", [profileId]);
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO projects
         (profile_id, slug, title, summary, description_md, role, tech_stack_json, start_date, end_date,
          status, is_featured, sort_order, cover_media_id, demo_url, repo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          profileId,
          slug,
          title,
          summary || null,
          description_md || null,
          role || null,
          tech_stack_json ? JSON.stringify(tech_stack_json) : null,
          start_date || null,
          end_date || null,
          status,
          is_featured,
          nextSort,
          Number.isFinite(cover_media_id) ? cover_media_id : null,
          demo_url || null,
          repo_url || null,
        ]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM projects WHERE id = ?", [id]);
      return { ...rows[0], medias: [], tags: [] };
    });
  } catch (error) {
    throw new Error("ไม่สามารถสร้าง project ได้: " + error.message);
  }
};

const updateMyProject = async (userId, id, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) throw new Error("id ไม่ถูกต้อง");

    const validStatus = new Set(["active", "completed", "draft"]);

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT * FROM projects WHERE id = ? AND profile_id = ? LIMIT 1", [projectId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ project");
      const cur = exist[0];

      const next = {
        slug: payload?.slug !== undefined ? String(payload.slug || "").trim() : cur.slug,
        title: payload?.title !== undefined ? String(payload.title || "").trim() : cur.title,
        summary: payload?.summary !== undefined ? String(payload.summary || "").trim() : cur.summary,
        description_md:
          payload?.description_md !== undefined ? (payload.description_md ? String(payload.description_md) : null) : cur.description_md,
        role: payload?.role !== undefined ? String(payload.role || "").trim() : cur.role,
        tech_stack_json:
          payload?.tech_stack_json !== undefined ? (payload.tech_stack_json ? JSON.stringify(payload.tech_stack_json) : null) : cur.tech_stack_json,
        start_date: payload?.start_date !== undefined ? (payload.start_date ? String(payload.start_date) : null) : cur.start_date,
        end_date: payload?.end_date !== undefined ? (payload.end_date ? String(payload.end_date) : null) : cur.end_date,
        status: payload?.status !== undefined ? String(payload.status || "").trim() : cur.status,
        is_featured: payload?.is_featured !== undefined ? (payload.is_featured ? 1 : 0) : cur.is_featured,
        cover_media_id:
          payload?.cover_media_id !== undefined
            ? (payload.cover_media_id === null || payload.cover_media_id === "" ? null : Number(payload.cover_media_id))
            : cur.cover_media_id,
        demo_url: payload?.demo_url !== undefined ? String(payload.demo_url || "").trim() : cur.demo_url,
        repo_url: payload?.repo_url !== undefined ? String(payload.repo_url || "").trim() : cur.repo_url,
      };

      if (!next.slug) throw new Error("กรุณากรอก slug");
      if (!next.title) throw new Error("กรุณากรอก title");
      if (!validStatus.has(next.status)) throw new Error("status ไม่ถูกต้อง");

      await conn.query(
        `UPDATE projects
         SET slug = ?, title = ?, summary = ?, description_md = ?, role = ?, tech_stack_json = ?,
             start_date = ?, end_date = ?, status = ?, is_featured = ?, cover_media_id = ?, demo_url = ?, repo_url = ?,
             updated_at = NOW()
         WHERE id = ? AND profile_id = ?`,
        [
          next.slug,
          next.title,
          next.summary || null,
          next.description_md || null,
          next.role || null,
          next.tech_stack_json || null,
          next.start_date || null,
          next.end_date || null,
          next.status,
          next.is_featured,
          Number.isFinite(next.cover_media_id) ? next.cover_media_id : null,
          next.demo_url || null,
          next.repo_url || null,
          projectId,
          profileId,
        ]
      );

      // return full
      const projects = await conn.query("SELECT * FROM projects WHERE id = ?", [projectId]);
      const medias = await conn.query(
        "SELECT * FROM project_media WHERE project_id = ? ORDER BY sort_order ASC, id ASC",
        [projectId]
      );
      const tags = await conn.query(
        `SELECT pt.project_id, t.id AS tag_id, t.name, t.slug
         FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
         WHERE pt.project_id = ? ORDER BY t.name ASC`,
        [projectId]
      );
      return _combineProjects(projects, medias, tags)[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข project ได้: " + error.message);
  }
};

const deleteMyProject = async (userId, id) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) throw new Error("id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const exist = await conn.query("SELECT id FROM projects WHERE id = ? AND profile_id = ? LIMIT 1", [projectId, profileId]);
      if (exist.length === 0) throw new Error("ไม่พบ project");
      await conn.query("DELETE FROM projects WHERE id = ? AND profile_id = ?", [projectId, profileId]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ project ได้: " + error.message);
  }
};

const reorderMyProjects = async (userId, orderedIds = []) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT id FROM projects WHERE profile_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [profileId, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");
      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE projects SET sort_order = ?, updated_at = NOW() WHERE id = ? AND profile_id = ?", [i, ids[i], profileId]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ project ได้: " + error.message);
  }
};

// ---------- project media ----------

const addMyProjectMedia = async (userId, projectId, payload) => {
  try {
    const profileId = await getProfileIdByUserId(userId);
    if (!profileId) throw new Error("ยังไม่มีโปรไฟล์");
    const pid = Number(projectId);
    if (!Number.isFinite(pid)) throw new Error("project_id ไม่ถูกต้อง");
    const media_id = Number(payload?.media_id);
    if (!Number.isFinite(media_id)) throw new Error("media_id ไม่ถูกต้อง");
    const caption = payload?.caption !== undefined ? String(payload.caption || "").trim() : null;

    return await withTx(async (conn) => {
      const own = await conn.query("SELECT id FROM projects WHERE id = ? AND profile_id = ? LIMIT 1", [pid, profileId]);
      if (own.length === 0) throw new Error("ไม่พบ project");

      const maxRows = await conn.query("SELECT COALESCE(MAX(sort_order),0) AS mx FROM project_media WHERE project_id = ?", [pid]);
      const nextSort = Number(maxRows[0]?.mx || 0) + 1;

      const res = await conn.query(
        `INSERT INTO project_media
         (project_id, media_id, caption, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [pid, media_id, caption || null, nextSort]
      );
      const id = Number(res.insertId);
      const rows = await conn.query("SELECT * FROM project_media WHERE id = ?", [id]);
      return rows[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถเพิ่มรูป/ไฟล์ให้ project ได้: " + error.message);
  }
};

const updateMyProjectMedia = async (userId, projectMediaId, payload) => {
  try {
    const pmid = Number(projectMediaId);
    if (!Number.isFinite(pmid)) throw new Error("project_media_id ไม่ถูกต้อง");
    const caption = payload?.caption !== undefined ? String(payload.caption || "").trim() : undefined;

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT pm.*
         FROM project_media pm
         JOIN projects p ON p.id = pm.project_id
         JOIN profiles pr ON pr.id = p.profile_id
         WHERE pm.id = ? AND pr.user_id = ?
         LIMIT 1`,
        [pmid, Number(userId)]
      );
      if (rows.length === 0) throw new Error("ไม่พบ project_media");
      const cur = rows[0];
      const nextCaption = caption !== undefined ? (caption || null) : cur.caption;

      await conn.query("UPDATE project_media SET caption = ?, updated_at = NOW() WHERE id = ?", [nextCaption, pmid]);
      const after = await conn.query("SELECT * FROM project_media WHERE id = ?", [pmid]);
      return after[0];
    });
  } catch (error) {
    throw new Error("ไม่สามารถแก้ไข project_media ได้: " + error.message);
  }
};

const deleteMyProjectMedia = async (userId, projectMediaId) => {
  try {
    const pmid = Number(projectMediaId);
    if (!Number.isFinite(pmid)) throw new Error("project_media_id ไม่ถูกต้อง");

    return await withTx(async (conn) => {
      const rows = await conn.query(
        `SELECT pm.id
         FROM project_media pm
         JOIN projects p ON p.id = pm.project_id
         JOIN profiles pr ON pr.id = p.profile_id
         WHERE pm.id = ? AND pr.user_id = ?
         LIMIT 1`,
        [pmid, Number(userId)]
      );
      if (rows.length === 0) throw new Error("ไม่พบ project_media");
      await conn.query("DELETE FROM project_media WHERE id = ?", [pmid]);
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบ project_media ได้: " + error.message);
  }
};

const reorderMyProjectMedias = async (userId, projectId, orderedIds = []) => {
  try {
    const pid = Number(projectId);
    if (!Number.isFinite(pid)) throw new Error("project_id ไม่ถูกต้อง");
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) return { ok: true };

    return await withTx(async (conn) => {
      const own = await conn.query(
        `SELECT p.id
         FROM projects p
         JOIN profiles pr ON pr.id = p.profile_id
         WHERE p.id = ? AND pr.user_id = ?
         LIMIT 1`,
        [pid, Number(userId)]
      );
      if (own.length === 0) throw new Error("ไม่พบ project");

      const rows = await conn.query(
        `SELECT id FROM project_media WHERE project_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [pid, ...ids]
      );
      const set = new Set(rows.map((r) => Number(r.id)));
      for (const id of ids) if (!set.has(id)) throw new Error("มีรายการที่ไม่ถูกต้องใน reorder");

      for (let i = 0; i < ids.length; i++) {
        await conn.query("UPDATE project_media SET sort_order = ?, updated_at = NOW() WHERE id = ? AND project_id = ?", [i, ids[i], pid]);
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถจัดลำดับ project_media ได้: " + error.message);
  }
};

// ---------- project tags ----------

const setMyProjectTags = async (userId, projectId, tagIds = []) => {
  try {
    const pid = Number(projectId);
    if (!Number.isFinite(pid)) throw new Error("project_id ไม่ถูกต้อง");
    const ids = Array.isArray(tagIds) ? tagIds.map(Number).filter(Number.isFinite) : [];

    return await withTx(async (conn) => {
      const own = await conn.query(
        `SELECT p.id
         FROM projects p
         JOIN profiles pr ON pr.id = p.profile_id
         WHERE p.id = ? AND pr.user_id = ?
         LIMIT 1`,
        [pid, Number(userId)]
      );
      if (own.length === 0) throw new Error("ไม่พบ project");

      // validate tag ids
      if (ids.length > 0) {
        const tagRows = await conn.query(
          `SELECT id FROM tags WHERE id IN (${ids.map(() => "?").join(",")})`,
          ids
        );
        const set = new Set(tagRows.map((r) => Number(r.id)));
        for (const id of ids) if (!set.has(id)) throw new Error("มี tag ที่ไม่ถูกต้อง");
      }

      await conn.query("DELETE FROM project_tags WHERE project_id = ?", [pid]);
      for (const tid of ids) {
        await conn.query(
          "INSERT INTO project_tags (project_id, tag_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
          [pid, tid]
        );
      }
      return { ok: true };
    });
  } catch (error) {
    throw new Error("ไม่สามารถตั้งค่า tags ให้ project ได้: " + error.message);
  }
};

module.exports = {
  listMyProjects,
  createMyProject,
  updateMyProject,
  deleteMyProject,
  reorderMyProjects,
  addMyProjectMedia,
  updateMyProjectMedia,
  deleteMyProjectMedia,
  reorderMyProjectMedias,
  setMyProjectTags,
};
