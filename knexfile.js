// knexfile.js
const config = require("./config");


const base = {
    client: "mysql2",
    connection: config.mariadb,
    pool: { min: 2, max: 20 },
    migrations: { directory: "./migrations", tableName: "knex_migrations" },
    seeds: { directory: "./seeds" },
};

module.exports = {
    development: base,
};
