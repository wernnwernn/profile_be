// middlewares/requestId.js
const crypto = require("crypto");

const requestIdMiddleware = () => (req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader("x-request-id", req.requestId);
  next();
};

module.exports = { requestIdMiddleware };
