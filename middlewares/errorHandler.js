// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(`[${req.requestId || "-"}]`, err);

  const isProd = String(process.env.NODE_ENV) === "production";
  res.status(500).json({
    message: "Internal server error",
    requestId: req.requestId,
    ...(isProd ? {} : { error: String(err?.message || err) }),
  });
};

const notFound = (req, res) => res.status(404).json({ message: "Not found" });

module.exports = { errorHandler, notFound };