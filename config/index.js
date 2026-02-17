// config/index.js
require("./env");
const { cleanEnv, str, port } = require("envalid");

const env = cleanEnv(process.env, {
    MARIADB_HOST: str(),
    MARIADB_PORT: port({ default: 3306 }),
    MARIADB_USER: str(),
    MARIADB_PASSWORD: str(),
    MARIADB_DB: str(),
});

module.exports = {
    mariadb: {
        host: env.MARIADB_HOST,
        port: env.MARIADB_PORT,
        user: env.MARIADB_USER,
        password: env.MARIADB_PASSWORD,
        database: env.MARIADB_DB,
    },
};