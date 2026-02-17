// server.js
const loaded = require("./config/env");
const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const { requestIdMiddleware } = require("./middlewares/requestId");
const { createHttpLogger } = require("./middlewares/httpLogger");
const { createHelmet } = require("./middlewares/helmet");
const { createCors } = require("./middlewares/cors");
const { createGlobalRateLimiter } = require("./middlewares/rateLimit");
const { errorHandler } = require("./middlewares/errorHandler");

const healthRouter = require("./controller/health");

const app = express();

// ------------------ MIDDLEWARE ------------------------
app.set("trust proxy", 1);

app.use(requestIdMiddleware());
app.use(createHttpLogger());

app.use(createHelmet());
app.use(createCors());

app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(createGlobalRateLimiter());

//-------------------------------------------------------

app.use("/api", healthRouter);

app.use(errorHandler);


const PORT = process.env.PORT || 5000;
console.log(`[ENV] APP_ENV=${loaded.APP_ENV} (${loaded.ENV_FILE})`);
app.listen(PORT, () => console.log(`🚀 Server running on port: ${PORT}`));