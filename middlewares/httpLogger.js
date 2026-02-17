// src/middlewares/httpLogger.js
const morgan = require("morgan");

morgan.token("rid", (req) => req.requestId);

const formatLine = (tokens, req, res) =>
  [
    tokens.date(req, res, "iso"),
    tokens.rid(req, res),
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    `${tokens["response-time"](req, res)} ms`,
    "-",
    tokens.res(req, res, "content-length"),
  ].join(" ");

const createHttpLogger = (opts = {}) => {
  const {
    appEnv = String(process.env.APP_ENV || "local").toLowerCase(),
    slowMs = Number(process.env.LOG_SLOW_MS || 500),
    skipPaths = ["/api/health"],
  } = opts;

  const makeSkip = (req, res) => skipPaths.includes(req.originalUrl);

  if (appEnv === "local" || appEnv === "dev") {
    return morgan(formatLine, { skip: makeSkip });
  }

  return morgan((tokens, req, res) => {
    if (makeSkip(req, res)) return null;

    const status = Number(tokens.status(req, res) || res.statusCode || 0);
    const rt = Number(tokens["response-time"](req, res) || 0);

    const isError = status >= 400;
    const isSlow = rt > slowMs;

    if (isError || isSlow) return formatLine(tokens, req, res);
    return null;
  });
};

module.exports = { createHttpLogger };
