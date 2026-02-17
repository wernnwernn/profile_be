// services/dbService.js
const pool = require("../db/mariaPool");

const withConn = async (fn) => {
  let conn;
  try {
    conn = await pool.getConnection();
    return await fn(conn);
  } finally {
    if (conn) conn.release();
  }
};

const withTx = async (fn) => {
  return withConn(async (conn) => {
    await conn.beginTransaction();
    try {
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  });
};

module.exports = { withConn, withTx };
