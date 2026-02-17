// middlewares/helmet.js
const helmet = require("helmet");

const createHelmet = () =>
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

module.exports = { createHelmet };
