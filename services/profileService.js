// services/profileService.js
const { withConn, withTx } = require("./dbService");
const { writeAudit } = require("./auditLogService");

const getMyProfile = async (userId) => {
  try {
    return await withConn(async (conn) => {
      const rows = await conn.query("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [Number(userId)]);
      return rows[0] || null;
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงข้อมูลโปรไฟล์ได้: " + error.message);
  }
};

const upsertMyProfile = async (userId, payload, ctx = {}) => {
  try {
    const user_id = Number(userId);

    return await withTx(async (conn) => {
      const userRows = await conn.query("SELECT username FROM users WHERE id = ? LIMIT 1", [user_id]);
      if (userRows.length === 0) throw new Error("ไม่พบผู้ใช้งานนี้");
      const username = userRows[0].username;

      const beforeRows = await conn.query("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [user_id]);
      const before = beforeRows[0] || null;

      if (!payload.display_name) throw new Error("กรุณากรอก display_name");

      let show_content = null;
      if (payload.show_content !== undefined) {
        try {
          // If it's already an object, use it directly. Otherwise try to parse
          const parsed = typeof payload.show_content === 'string' ? JSON.parse(payload.show_content) : payload.show_content;
          show_content = JSON.stringify(parsed);
        } catch (e) {
          show_content = null;
        }
      }

      if (!before) {
        const res = await conn.query(
          `INSERT INTO profiles
           (user_id, slug, display_name, headline, about_md, email_public, phone_public, location, github_public,
            avatar_media_id, resume_media_id, is_published, show_content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            user_id,
            username,
            payload.display_name,
            payload.headline || null,
            payload.about_md || null,
            payload.email_public || null,
            payload.phone_public || null,
            payload.location || null,
            payload.github_public || null,
            payload.avatar_media_id || null,
            payload.resume_media_id || null,
            payload.is_published ? 1 : 0,
            show_content,
          ]
        );
        const id = Number(res.insertId);
        const afterRows = await conn.query("SELECT * FROM profiles WHERE id = ?", [id]);
        const after = afterRows[0];

        await writeAudit({
          user_id,
          action: "CREATE",
          entity: "profiles",
          entity_id: id,
          before_json: null,
          after_json: after,
          ip: ctx.ip,
          user_agent: ctx.user_agent,
          request_id: ctx.request_id,
        });

        return after;
      }

      await conn.query(
        `UPDATE profiles
         SET slug = ?, display_name = ?, headline = ?, about_md = ?, email_public = ?, phone_public = ?, location = ?, github_public = ?,
             avatar_media_id = ?, resume_media_id = ?, is_published = ?, show_content = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [
          username,
          payload.display_name,
          payload.headline || null,
          payload.about_md || null,
          payload.email_public || null,
          payload.phone_public || null,
          payload.location || null,
          payload.github_public || null,
          payload.avatar_media_id || null,
          payload.resume_media_id || null,
          payload.is_published ? 1 : 0,
          show_content,
          user_id,
        ]
      );

      const afterRows = await conn.query("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [user_id]);
      const after = afterRows[0];

      await writeAudit({
        user_id,
        action: "UPDATE",
        entity: "profiles",
        entity_id: before.id,
        before_json: before,
        after_json: after,
        ip: ctx.ip,
        user_agent: ctx.user_agent,
        request_id: ctx.request_id,
      });

      return after;
    });
  } catch (error) {
    throw new Error("ไม่สามารถบันทึกโปรไฟล์ได้: " + error.message);
  }
};

const getPublicProfileBySlug = async (slug) => {
  try {
    const s = String(slug || "").trim();
    return await withConn(async (conn) => {
      const rows = await conn.query(
        `SELECT * FROM profiles WHERE slug = ? AND is_published = 1 LIMIT 1`,
        [s]
      );
      return rows[0] || null;
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงโปรไฟล์สาธารณะได้: " + error.message);
  }
};


const getPublicProfileFullBySlug = async (slug) => {
  try {
    const s = String(slug || "").trim();
    return await withConn(async (conn) => {
      const profRows = await conn.query("SELECT * FROM profiles WHERE slug = ? AND is_published = 1 LIMIT 1", [s]);
      const profile = profRows[0] || null;
      if (!profile) return null;

      const profileId = Number(profile.id);

      const links = await conn.query("SELECT * FROM profile_links WHERE profile_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC", [profileId]);
      const skills = await conn.query("SELECT * FROM skills WHERE profile_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC", [profileId]);
      const educations = await conn.query("SELECT * FROM educations WHERE profile_id = ? ORDER BY sort_order ASC, id ASC", [profileId]);
      const certificates = await conn.query("SELECT * FROM certificates WHERE profile_id = ? ORDER BY sort_order ASC, id ASC", [profileId]);

      const experiences = await conn.query("SELECT * FROM experiences WHERE profile_id = ? ORDER BY sort_order ASC, start_date DESC, id DESC", [profileId]);
      let highlights = [];
      if (experiences.length > 0) {
        const expIds = experiences.map((e) => Number(e.id));
        highlights = await conn.query(
          `SELECT * FROM experience_highlights WHERE experience_id IN (${expIds.map(() => "?").join(",")}) ORDER BY experience_id ASC, sort_order ASC, id ASC`,
          expIds
        );
      }
      const expMap = new Map();
      experiences.forEach((e) => expMap.set(Number(e.id), { ...e, highlights: [] }));
      highlights.forEach((h) => {
        const t = expMap.get(Number(h.experience_id));
        if (t) t.highlights.push(h);
      });
      const experiencesWithHighlights = Array.from(expMap.values());

      // projects (exclude draft for public)
      const projects = await conn.query("SELECT * FROM projects WHERE profile_id = ? AND status != \"draft\" ORDER BY sort_order ASC, id DESC", [profileId]);
      let projectMedias = [];
      let projectTags = [];
      if (projects.length > 0) {
        const pids = projects.map((p) => Number(p.id));
        projectMedias = await conn.query(
          `SELECT pm.id, pm.project_id, pm.media_id, pm.caption, pm.sort_order, pm.created_at, pm.updated_at
           FROM project_media pm
           WHERE pm.project_id IN (${pids.map(() => "?").join(",")})
           ORDER BY pm.project_id ASC, pm.sort_order ASC, pm.id ASC`,
          pids
        );
        projectTags = await conn.query(
          `SELECT pt.project_id, t.id AS tag_id, t.name, t.slug
           FROM project_tags pt
           JOIN tags t ON t.id = pt.tag_id
           WHERE pt.project_id IN (${pids.map(() => "?").join(",")})
           ORDER BY pt.project_id ASC, t.name ASC`,
          pids
        );
      }

      const pMap = new Map();
      projects.forEach((p) => pMap.set(Number(p.id), { ...p, medias: [], tags: [] }));
      projectMedias.forEach((m) => {
        const t = pMap.get(Number(m.project_id));
        if (t) t.medias.push(m);
      });
      projectTags.forEach((t) => {
        const p = pMap.get(Number(t.project_id));
        if (p) p.tags.push({ id: t.tag_id, name: t.name, slug: t.slug });
      });

      return {
        profile,
        links,
        skills,
        experiences: experiencesWithHighlights,
        educations,
        certificates,
        projects: Array.from(pMap.values()),
      };
    });
  } catch (error) {
    throw new Error("ไม่สามารถดึงโปรไฟล์สาธารณะ (full) ได้: " + error.message);
  }
};

module.exports = { getMyProfile, upsertMyProfile, getPublicProfileBySlug, getPublicProfileFullBySlug };
