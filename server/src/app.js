import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { allowedFrontendOrigins } from "./config.js";
import { pool, redis } from "./db.js";
import { paths as apiPaths } from "./openapi.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error-handler.js";
import emergencyRoutes from "./routes/emergency.routes.js";
import accountRoutes from "./routes/account.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import hospitalRoutes from "./routes/hospital.routes.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: [...allowedFrontendOrigins],
    credentials: true,
  }),
);
app.use(express.json({ limit: "30kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader("X-Request-Id", req.id);
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.path !== "/api/auth/login" &&
    req.path !== "/api/auth/register"
  ) {
    const origin = req.get("origin");
    if (origin && !allowedFrontendOrigins.has(origin)) {
      return res.status(403).json({ error: "Invalid request origin" });
    }
  }
  next();
});
app.use((req, res, next) => {
  const t = Date.now();
  const logPath = req.path.replace(
    /^(\/api\/emergency)\/[^/]+/,
    "$1/:token",
  );
  res.on("finish", () =>
    console.info(
      JSON.stringify({
        requestId: req.id,
        method: req.method,
        path: logPath,
        status: res.statusCode,
        durationMs: Date.now() - t,
      }),
    ),
  );
  next();
});
// Verification actions happen after authentication, so scope this limit to the
// account rather than the shared browser/NAT IP. Give registration + contact
// setup room to complete while keeping OTP requests bounded.
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
app.get("/api/docs", (req, res) =>
  res.json({
    openapi: "3.0.3",
    info: { title: "Beacon Emergency Assistance API", version: "1.0.0" },
    servers: [{ url: process.env.BACKEND_URL || "http://localhost:4000" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "session" },
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    paths: apiPaths,
  }),
);
app.get(
  "/health",
  wrap(async (req, res) => {
    let database = "ok",
      cache = "unavailable";
    try {
      await pool.query("select 1");
    } catch {
      database = "error";
    }
    if (redis) {
      try {
        await redis.ping();
        cache = "ok";
      } catch {
        cache = "error";
      }
    }
    res.status(database === "ok" ? 200 : 503).json({
      status: database === "ok" ? "ok" : "degraded",
      database,
      redis: cache,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }),
);
app.use("/api", accountRoutes);
app.use("/api", vehicleRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api", alertRoutes);
app.use("/api", hospitalRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
