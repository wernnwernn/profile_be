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

// controllers
const healthRouter = require("./controller/health");
const authRouter = require("./controller/auth");
const mediaRouter = require("./controller/media");
const profilesRouter = require("./controller/profiles");
const usersRouter = require("./controller/users");
const profileLinksRouter = require("./controller/profileLinks");
const skillsRouter = require("./controller/skills");
const educationsRouter = require("./controller/educations");
const experiencesRouter = require("./controller/experiences");
const certificatesRouter = require("./controller/certificates");
const tagsRouter = require("./controller/tags");
const projectsRouter = require("./controller/projects");

const app = express();

// ------------------ MIDDLEWARE ------------------------
app.set("trust proxy", 1);

app.use(requestIdMiddleware());
app.use(createHttpLogger());

app.use(createHelmet());
app.use(createCors());

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(createGlobalRateLimiter());

//-------------------------------------------------------

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", mediaRouter);
app.use("/api", profilesRouter);
app.use("/api", usersRouter);

// profile cms modules (me/*)
app.use("/api", profileLinksRouter);
app.use("/api", skillsRouter);
app.use("/api", educationsRouter);
app.use("/api", experiencesRouter);
app.use("/api", certificatesRouter);
app.use("/api", tagsRouter);
app.use("/api", projectsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
console.log(`[ENV] APP_ENV=${loaded.APP_ENV} (${loaded.ENV_FILE})`);
app.listen(PORT, () => console.log(`🚀 Server running on port: ${PORT}`));
