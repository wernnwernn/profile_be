// db/mariaPool.js
const mariadb = require("mariadb");
const config = require("../config");

const pool = mariadb.createPool({
    host: config.mariadb.host,
    port: config.mariadb.port,
    user: config.mariadb.user,
    password: config.mariadb.password,
    database: config.mariadb.database,
    connectionLimit: 5,
});

module.exports = pool;
