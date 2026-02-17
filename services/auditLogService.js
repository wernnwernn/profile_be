// services/auditLogService.js
const { withConn } = require("./dbService");

const writeAudit = async ({ user_id, action, entity, entity_id, before_json, after_json, ip, user_agent, request_id }) => {
  try {
    await withConn(async (conn) => {
      await conn.query(
        `INSERT INTO audit_logs
         (user_id, action, entity, entity_id, before_json, after_json, ip, user_agent, request_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          user_id || null,
          String(action),
          String(entity),
          entity_id || null,
          before_json ? JSON.stringify(before_json) : null,
          after_json ? JSON.stringify(after_json) : null,
          ip || null,
          user_agent || null,
          request_id || null,
        ]
      );
    });
  } catch (e) {
    console.error("writeAudit error:", e);
  }
};

module.exports = { writeAudit };
