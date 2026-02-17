// middlewares/rateLimit.js
const rateLimit = require("express-rate-limit");

const createGlobalRateLimiter = () =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_PER_MIN || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests" },
  });

module.exports = { createGlobalRateLimiter };
