// src/config/env.js
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const appEnv = String(process.env.APP_ENV || "local").trim(); // local/dev/test/prod
const envFile = `.env.${appEnv}`;
const envPath = path.resolve(process.cwd(), envFile);

const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  throw new Error(`Cannot load env file: ${envFile} (${envPath})`);
}

module.exports = { APP_ENV: appEnv, ENV_FILE: envFile };
