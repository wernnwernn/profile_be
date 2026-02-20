// src/middlewares/httpLogger.js
const morgan = require("morgan");

morgan.token("rid", (req) => req.requestId || "-");

const formatLine = (tokens, req, res) =>
  [
    tokens.date(req, res, "iso"),
    tokens.rid(req, res),
    tokens.method(req, res),
    tokens.url(req, res),
    res.statusCode,
    `${Number(tokens["response-time"](req, res) || 0).toFixed(1)} ms`,
    "-",
    tokens.res(req, res, "content-length") || "-",
  ].join(" ");

const createHttpLogger = (opts = {}) => {
  const {
    appEnv = String(process.env.APP_ENV || "local").toLowerCase(),
    slowMs = Number(process.env.LOG_SLOW_MS || 500),
    skipPaths = ["/api/health"],
  } = opts;

  const shouldSkip = (req) => {
    const p = req.path || req.originalUrl || "";
    return skipPaths.some((sp) => p === sp || p.startsWith(`${sp}/`));
  };

  if (appEnv === "local" || appEnv === "dev") {
    return morgan(formatLine, { skip: (req) => shouldSkip(req) });
  }

  return morgan((tokens, req, res) => {
    if (shouldSkip(req)) return null;

    const status = Number(res.statusCode || 0);

    const rtRaw = tokens["response-time"](req, res);
    const rt = Number(rtRaw);
    const responseTimeMs = Number.isFinite(rt) ? rt : 0;

    const isError = status >= 400;
    const isSlow = responseTimeMs > slowMs;

    if (isError || isSlow) return formatLine(tokens, req, res);
    return null;
  });
};

module.exports = { createHttpLogger };