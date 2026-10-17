import "./config.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { db, pool, redis } from "./db.js";
import {
  users,
  vehicles,
  contacts,
  alerts,
  alertEvents,
  notifications,
  auditLogs,
} from "./schema.js";
import { newQrToken, qrDataUrl } from "./services/qr.js";
import {
  sendAlertSms,
  startPhoneVerification,
  checkPhoneVerification,
} from "./services/twilio.js";
import { nearbyHospitals } from "./services/hospitals.js";
import {
  emergencySubmissionSchema,
  emailSchema as email,
  phoneSchema as phone,
  passwordSchema as pass,
  vehicleInputSchema as vehicleInput,
  contactInputSchema,
  contactUpdateSchema,
} from "./validators.js";
import { paths as apiPaths } from "./openapi.js";
const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
const productionFrontendUrl = "https://final-sem-project-chi.vercel.app";
const defaultFrontendUrl =
  process.env.NODE_ENV === "production"
    ? productionFrontendUrl
    : "http://localhost:5173";
const frontendUrls = (process.env.FRONTEND_URL || defaultFrontendUrl)
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const allowedFrontendOrigins = new Set([
  ...frontendUrls,
  productionFrontendUrl,
]);
const frontendUrl = frontendUrls[0] || productionFrontendUrl;
if (!jwtSecret || jwtSecret.length < 32)
  throw new Error("JWT_SECRET must contain at least 32 characters");
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
    req.path != "/api/auth/login" &&
    req.path != "/api/auth/register"
  ) {
    const origin = req.get("origin");
    if (
      origin &&
      !allowedFrontendOrigins.has(origin)
    )
      return res.status(403).json({ error: "Invalid request origin" });
  }
  next();
});
app.use((req, res, next) => {
  const t = Date.now();
  res.on("finish", () =>
    console.info(
      JSON.stringify({
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - t,
      }),
    ),
  );
  next();
});
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
// Verification actions happen after authentication, so scope this limit to the
// account rather than the shared browser/NAT IP. Give registration + contact
// setup room to complete while keeping OTP requests bounded.
const otpLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res
      .status(429)
      .json({
        error:
          "Too many verification requests for this account. Wait 15 minutes before trying again.",
      }),
});
const revokedLocal = new Map();
function issueCookie(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, {
    expiresIn: "12h",
    issuer: "qr-emergency",
  });
  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
}
async function auth(req, res, next) {
  try {
    const token = req.cookies.session;
    if (!token)
      return res.status(401).json({ error: "Authentication required" });
    if (redis?.status === "ready" && (await redis.get(`revoked:${token}`)))
      return res.status(401).json({ error: "Session expired" });
    const payload = jwt.verify(token, jwtSecret, { issuer: "qr-emergency" });
    const [u] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    if (!u?.isActive)
      return res.status(401).json({ error: "Account unavailable" });
    req.user = u;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
function admin(req, res, next) {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ error: "Administrator access required" });
  next();
}
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const pageParams = (req) => ({
  page: Math.max(1, Number(req.query.page) || 1),
  limit: Math.min(100, Math.max(1, Number(req.query.limit) || 20)),
});
function developmentOtpPayload(result) {
  const configured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
  return process.env.NODE_ENV === "development" &&
    !configured &&
    result?.devCode
    ? { developmentCode: result.devCode }
    : {};
}
async function audit(userId, action, entity, entityId, metadata = {}) {
  await db
    .insert(auditLogs)
    .values({ userId, action, entity, entityId, metadata });
}
app.get("/api/docs", (req, res) =>
  res.json({
    openapi: "3.0.3",
    info: { title: "Beacon Emergency Assistance API", version: "1.0.0" },
    servers: [{ url: process.env.BACKEND_URL || "http://localhost:4000" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "session" },
      },
    },
    security: [{ cookieAuth: [] }],
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
    res
      .status(database === "ok" ? 200 : 503)
      .json({
        status: database === "ok" ? "ok" : "degraded",
        database,
        redis: cache,
        uptimeSeconds: Math.floor(process.uptime()),
      });
  }),
);
app.post(
  "/api/auth/register",
  authLimit,
  wrap(async (req, res) => {
    const s = z
      .object({
        fullName: z.string().trim().min(2).max(120),
        email,
        password: pass,
        phone,
      })
      .parse(req.body);
    const [u] = await db
      .insert(users)
      .values({
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        passwordHash: await hash(s.password),
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
      });
    const delivery = await startPhoneVerification(s.phone);
    issueCookie(res, { ...u, role: "USER" });
    res
      .status(201)
      .json({
        user: { ...u, phoneVerified: false },
        verificationRequired: true,
        ...developmentOtpPayload(delivery),
      });
  }),
);
app.post(
  "/api/auth/login",
  authLimit,
  wrap(async (req, res) => {
    const s = z.object({ email, password: z.string().min(1) }).parse(req.body);
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, s.email.toLowerCase()))
      .limit(1);
    if (!u || !u.isActive || !(await verify(u.passwordHash, s.password)))
      return res.status(401).json({ error: "Email or password is incorrect" });
    issueCookie(res, u);
    res.json({
      user: {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        phoneVerified: u.phoneVerified,
        role: u.role,
      },
    });
  }),
);
app.post(
  "/api/auth/logout",
  auth,
  wrap(async (req, res) => {
    if (redis?.status === "ready")
      await redis.set(`revoked:${req.token}`, "1", "EX", 43200);
    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    res.json({ ok: true });
  }),
);
app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));
app.post(
  "/api/auth/verify-phone",
  auth,
  otpLimit,
  wrap(async (req, res) => {
    const s = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
    if (!(await checkPhoneVerification(req.user.phone, s.code)))
      return res
        .status(400)
        .json({ error: "Verification code is invalid or expired" });
    await db
      .update(users)
      .set({ phoneVerified: true })
      .where(eq(users.id, req.user.id));
    await audit(req.user.id, "PHONE_VERIFIED", "user", req.user.id);
    res.json({ verified: true });
  }),
);
app.post(
  "/api/auth/resend-code",
  auth,
  otpLimit,
  wrap(async (req, res) => {
    const delivery = await startPhoneVerification(req.user.phone);
    res.json({ sent: true, ...developmentOtpPayload(delivery) });
  }),
);
app.get("/api/users/profile", auth, (req, res) => res.json({ user: req.user }));
app.patch(
  "/api/users/profile",
  auth,
  wrap(async (req, res) => {
    const s = z
      .object({
        fullName: z.string().trim().min(2).max(120).optional(),
        phone: phone.optional(),
      })
      .refine((x) => Object.keys(x).length > 0)
      .parse(req.body);
    const vals = { ...s };
    let delivery;
    if (s.phone && s.phone !== req.user.phone) {
      vals.phoneVerified = false;
      delivery = await startPhoneVerification(s.phone);
    }
    const [u] = await db
      .update(users)
      .set(vals)
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        role: users.role,
      });
    res.json({ user: u, ...developmentOtpPayload(delivery) });
  }),
);
app.post(
  "/api/users/change-password",
  auth,
  wrap(async (req, res) => {
    const s = z
      .object({ currentPassword: z.string(), newPassword: pass })
      .parse(req.body);
    const [u] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!(await verify(u.passwordHash, s.currentPassword)))
      return res.status(400).json({ error: "Current password is incorrect" });
    await db
      .update(users)
      .set({ passwordHash: await hash(s.newPassword) })
      .where(eq(users.id, u.id));
    res.json({ changed: true });
  }),
);
function verified(req, res, next) {
  if (!req.user.phoneVerified)
    return res
      .status(403)
      .json({
        error: "Verify your phone before managing vehicles and contacts",
      });
  next();
}
app.get(
  "/api/vehicles",
  auth,
  verified,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const data = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.ownerId, req.user.id))
      .orderBy(desc(vehicles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ data, page, limit });
  }),
);
app.post(
  "/api/vehicles",
  auth,
  verified,
  wrap(async (req, res) => {
    const s = vehicleInput.parse(req.body);
    const [v] = await db
      .insert(vehicles)
      .values({ ...s, ownerId: req.user.id, qrToken: newQrToken() })
      .returning();
    await audit(req.user.id, "VEHICLE_CREATED", "vehicle", v.id);
    res.status(201).json({ vehicle: v });
  }),
);
async function ownedVehicle(id, userId) {
  const [v] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.ownerId, userId)))
    .limit(1);
  return v;
}
app.get(
  "/api/vehicles/:id",
  auth,
  verified,
  wrap(async (req, res) => {
    const v = await ownedVehicle(req.params.id, req.user.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    const cs = await db
      .select()
      .from(contacts)
      .where(eq(contacts.vehicleId, v.id));
    res.json({ vehicle: v, contacts: cs });
  }),
);
app.patch(
  "/api/vehicles/:id",
  auth,
  verified,
  wrap(async (req, res) => {
    const s = vehicleInput
      .partial()
      .extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() })
      .parse(req.body);
    const v = await ownedVehicle(req.params.id, req.user.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    const [updated] = await db
      .update(vehicles)
      .set(s)
      .where(eq(vehicles.id, v.id))
      .returning();
    res.json({ vehicle: updated });
  }),
);
app.delete(
  "/api/vehicles/:id",
  auth,
  verified,
  wrap(async (req, res) => {
    const v = await ownedVehicle(req.params.id, req.user.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    await db
      .update(vehicles)
      .set({ status: "INACTIVE" })
      .where(eq(vehicles.id, v.id));
    await audit(req.user.id, "VEHICLE_DEACTIVATED", "vehicle", v.id);
    res.status(204).end();
  }),
);
app.post(
  "/api/vehicles/:id/qr/regenerate",
  auth,
  verified,
  wrap(async (req, res) => {
    const v = await ownedVehicle(req.params.id, req.user.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    const [u] = await db
      .update(vehicles)
      .set({ qrToken: newQrToken() })
      .where(eq(vehicles.id, v.id))
      .returning();
    res.json({
      token: u.qrToken,
      url: `${frontendUrl}/emergency/${u.qrToken}`,
    });
  }),
);
app.get(
  "/api/vehicles/:id/qr.png",
  auth,
  verified,
  wrap(async (req, res) => {
    const v = await ownedVehicle(req.params.id, req.user.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    const data = await qrDataUrl(v.qrToken);
    res.type("png").send(Buffer.from(data.split(",")[1], "base64"));
  }),
);
app.get(
  "/api/contacts",
  auth,
  verified,
  wrap(async (req, res) => {
    const rows = await db
      .select({ contact: contacts, vehicle: vehicles })
      .from(contacts)
      .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
      .where(eq(vehicles.ownerId, req.user.id));
    res.json({
      data: rows.map((x) => ({
        ...x.contact,
        vehicleRegistration: x.vehicle.registrationNumber,
      })),
    });
  }),
);
app.post(
  "/api/vehicles/:id/contacts",
  auth,
  verified,
  otpLimit,
  wrap(async (req, res) => {
    const v = await ownedVehicle(req.params.id, req.user.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    const s = contactInputSchema.parse(req.body);
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from vehicles where id=${v.id} for update`,
      );
      const existing = await tx
        .select()
        .from(contacts)
        .where(eq(contacts.vehicleId, v.id));
      if (existing.length >= 2) return { limit: true };
      const [contact] = await tx
        .insert(contacts)
        .values({ vehicleId: v.id, ...s })
        .returning();
      return { contact };
    });
    if (result.limit)
      return res
        .status(409)
        .json({ error: "A vehicle can have at most 2 emergency contacts" });
    const delivery = await startPhoneVerification(result.contact.phone);
    res
      .status(201)
      .json({
        contact: result.contact,
        verificationRequired: true,
        ...developmentOtpPayload(delivery),
      });
  }),
);
app.patch(
  "/api/contacts/:id",
  auth,
  verified,
  wrap(async (req, res) => {
    const [c] = await db
      .select({ contact: contacts, ownerId: vehicles.ownerId })
      .from(contacts)
      .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
      .where(eq(contacts.id, req.params.id));
    if (!c || c.ownerId !== req.user.id)
      return res.status(404).json({ error: "Contact not found" });
    const s = contactUpdateSchema.parse(req.body);
    if (s.phone && s.phone !== c.contact.phone) {
      s.verified = false;
      await startPhoneVerification(s.phone);
    }
    const [updated] = await db
      .update(contacts)
      .set(s)
      .where(eq(contacts.id, c.contact.id))
      .returning();
    res.json({ contact: updated });
  }),
);
app.post(
  "/api/contacts/:id/resend-verify",
  auth,
  verified,
  otpLimit,
  wrap(async (req, res) => {
    const [c] = await db
      .select({ contact: contacts, ownerId: vehicles.ownerId })
      .from(contacts)
      .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
      .where(eq(contacts.id, req.params.id));
    if (!c || c.ownerId !== req.user.id)
      return res.status(404).json({ error: "Contact not found" });
    const delivery = await startPhoneVerification(c.contact.phone);
    res.json({ sent: true, ...developmentOtpPayload(delivery) });
  }),
);
app.delete(
  "/api/contacts/:id",
  auth,
  verified,
  wrap(async (req, res) => {
    const [c] = await db
      .select({ contact: contacts, ownerId: vehicles.ownerId })
      .from(contacts)
      .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
      .where(eq(contacts.id, req.params.id));
    if (!c || c.ownerId !== req.user.id)
      return res.status(404).json({ error: "Contact not found" });
    await db.delete(contacts).where(eq(contacts.id, c.contact.id));
    res.status(204).end();
  }),
);
app.post(
  "/api/contacts/:id/verify",
  auth,
  verified,
  otpLimit,
  wrap(async (req, res) => {
    const s = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
    const [c] = await db
      .select({ contact: contacts, ownerId: vehicles.ownerId })
      .from(contacts)
      .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
      .where(eq(contacts.id, req.params.id));
    if (!c || c.ownerId !== req.user.id)
      return res.status(404).json({ error: "Contact not found" });
    if (!(await checkPhoneVerification(c.contact.phone, s.code)))
      return res
        .status(400)
        .json({ error: "Verification code is invalid or expired" });
    await db
      .update(contacts)
      .set({ verified: true })
      .where(eq(contacts.id, c.contact.id));
    res.json({ verified: true });
  }),
);
app.get(
  "/api/emergency/:token",
  wrap(async (req, res) => {
    const [v] = await db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        color: vehicles.color,
        description: vehicles.description,
        registrationNumber: vehicles.registrationNumber,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(eq(vehicles.qrToken, req.params.token))
      .limit(1);
    if (!v || v.status !== "ACTIVE")
      return res
        .status(404)
        .json({ error: "This emergency QR is unavailable" });
    res.set("Cache-Control", "no-store");
    res.json({
      vehicle: {
        make: v.make,
        model: v.model,
        color: v.color,
        description: v.description,
        registrationNumber: v.registrationNumber,
      },
      emergencyTypes: ["ACCIDENT", "MEDICAL", "FIRE", "BREAKDOWN", "OTHER"],
    });
  }),
);

app.post(
  "/api/emergency/:token/alerts",
  rateLimit({
    windowMs: 60000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  wrap(async (req, res) => {
    const s = emergencySubmissionSchema.parse(req.body);
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.qrToken, req.params.token))
      .limit(1);
    if (!vehicle || vehicle.status !== "ACTIVE")
      return res
        .status(404)
        .json({ error: "This emergency QR is unavailable" });
    const persisted = await db.transaction(async (tx) => {
      const [alert] = await tx
        .insert(alerts)
        .values({
          vehicleId: vehicle.id,
          type: s.type,
          description: s.description || null,
          latitude: s.latitude == null ? null : String(s.latitude),
          longitude: s.longitude == null ? null : String(s.longitude),
          locationAccuracy:
            s.locationAccuracy == null ? null : String(s.locationAccuracy),
        })
        .returning();
      await tx
        .insert(alertEvents)
        .values({
          alertId: alert.id,
          eventType: "EMERGENCY_CREATED",
          details: { type: s.type, hasLocation: s.latitude != null },
        });
      const registered = await tx
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.vehicleId, vehicle.id), eq(contacts.verified, true)),
        );
      const pending = registered.length
        ? await tx
            .insert(notifications)
            .values(
              registered.map((c) => ({
                alertId: alert.id,
                contactId: c.id,
                destination: c.phone,
                status: "PENDING",
              })),
            )
            .returning()
        : [];
      return { alert, contacts: registered, pending };
    });
    const results = [];
    for (let i = 0; i < persisted.contacts.length; i++) {
      const contact = persisted.contacts[i],
        record = persisted.pending[i];
      let status = "FAILED",
        sid = null,
        error = null;
      try {
        sid = await sendAlertSms(
          contact.phone,
          `EMERGENCY: ${s.type} involving ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}). ${s.description || ""} ${s.latitude != null ? `Location: https://maps.google.com/?q=${s.latitude},${s.longitude}` : "Location unavailable"}`,
        );
        status = "SENT";
      } catch (e) {
        error = e.message;
        console.error(
          JSON.stringify({
            event: "sms_delivery_failed",
            alertId: persisted.alert.id,
            contactId: contact.id,
            message: e.message,
          }),
        );
      }
      await db
        .update(notifications)
        .set({ status, providerSid: sid, error })
        .where(eq(notifications.id, record.id));
      results.push(status);
    }
    await audit(null, "EMERGENCY_CREATED", "alert", persisted.alert.id, {
      type: s.type,
    });
    res
      .status(201)
      .json({
        alert: {
          id: persisted.alert.id,
          type: persisted.alert.type,
          status: persisted.alert.status,
          createdAt: persisted.alert.createdAt,
          latitude: persisted.alert.latitude,
          longitude: persisted.alert.longitude,
        },
        contacts: persisted.contacts.map((c) => ({
          name: c.name,
          phone: c.phone,
        })),
        notificationStatus:
          results.length === 0
            ? "NO_VERIFIED_CONTACTS"
            : results.every((x) => x === "SENT")
              ? "SENT"
              : "FAILED",
        message: results.some((x) => x === "FAILED")
          ? "Emergency alert was recorded, but notification delivery could not be confirmed."
          : "Emergency alert recorded.",
      });
  }),
);
app.get(
  "/api/alerts",
  auth,
  verified,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const data = await db
      .select({ alert: alerts, vehicle: vehicles })
      .from(alerts)
      .innerJoin(vehicles, eq(alerts.vehicleId, vehicles.id))
      .where(eq(vehicles.ownerId, req.user.id))
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({
      data: data.map((x) => ({
        ...x.alert,
        vehicle: {
          id: x.vehicle.id,
          registrationNumber: x.vehicle.registrationNumber,
          make: x.vehicle.make,
          model: x.vehicle.model,
        },
      })),
      page,
      limit,
    });
  }),
);
app.patch(
  "/api/alerts/:id/status",
  auth,
  verified,
  wrap(async (req, res) => {
    const s = z
      .object({ status: z.enum(["ACKNOWLEDGED", "RESOLVED"]) })
      .parse(req.body);
    const [row] = await db
      .select({ alert: alerts, ownerId: vehicles.ownerId })
      .from(alerts)
      .innerJoin(vehicles, eq(alerts.vehicleId, vehicles.id))
      .where(eq(alerts.id, req.params.id));
    if (!row || row.ownerId !== req.user.id)
      return res.status(404).json({ error: "Alert not found" });
    const [updated] = await db
      .update(alerts)
      .set({ status: s.status })
      .where(eq(alerts.id, row.alert.id))
      .returning();
    await db
      .insert(alertEvents)
      .values({
        alertId: updated.id,
        actorUserId: req.user.id,
        eventType: s.status,
        details: { status: s.status },
      });
    await audit(req.user.id, `ALERT_${s.status}`, "alert", updated.id);
    res.json({ alert: updated });
  }),
);
app.get(
  "/api/hospitals",
  wrap(async (req, res) => {
    const s = z
      .object({
        latitude: z.coerce.number().min(-90).max(90),
        longitude: z.coerce.number().min(-180).max(180),
      })
      .parse(req.query);
    try {
      res.json({ data: await nearbyHospitals(s.latitude, s.longitude) });
    } catch (e) {
      console.error(
        JSON.stringify({ event: "hospital_search_failed", message: e.message }),
      );
      res
        .status(503)
        .json({ error: "Nearby hospital search is temporarily unavailable." });
    }
  }),
);
app.get(
  "/api/admin/overview",
  auth,
  admin,
  wrap(async (req, res) => {
    const [u] = await db.select({ count: sql`count(*)` }).from(users);
    const [v] = await db.select({ count: sql`count(*)` }).from(vehicles);
    const [a] = await db.select({ count: sql`count(*)` }).from(alerts);
    const [f] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(eq(notifications.status, "FAILED"));
    res.json({
      users: Number(u.count),
      vehicles: Number(v.count),
      alerts: Number(a.count),
      failedNotifications: Number(f.count),
    });
  }),
);
app.get(
  "/api/admin/users",
  auth,
  admin,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const q = String(req.query.search || "");
    const filter = q
      ? or(ilike(users.email, `%${q}%`), ilike(users.fullName, `%${q}%`))
      : undefined;
    const data = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(filter)
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ data, page, limit });
  }),
);
app.patch(
  "/api/admin/users/:id",
  auth,
  admin,
  wrap(async (req, res) => {
    const s = z
      .object({
        isActive: z.boolean().optional(),
        role: z.enum(["USER", "ADMIN"]).optional(),
      })
      .refine((x) => Object.keys(x).length > 0)
      .parse(req.body);
    if (req.params.id === req.user.id && s.isActive === false)
      return res
        .status(400)
        .json({ error: "You cannot disable your own account" });
    const [u] = await db
      .update(users)
      .set(s)
      .where(eq(users.id, req.params.id))
      .returning({ id: users.id, isActive: users.isActive, role: users.role });
    if (!u) return res.status(404).json({ error: "User not found" });
    await audit(req.user.id, "ADMIN_USER_UPDATED", "user", u.id, s);
    res.json({ user: u });
  }),
);
app.get(
  "/api/admin/vehicles",
  auth,
  admin,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const data = await db
      .select({
        vehicle: vehicles,
        ownerName: users.fullName,
        ownerEmail: users.email,
      })
      .from(vehicles)
      .innerJoin(users, eq(vehicles.ownerId, users.id))
      .orderBy(desc(vehicles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ data, page, limit });
  }),
);
app.patch(
  "/api/admin/vehicles/:id",
  auth,
  admin,
  wrap(async (req, res) => {
    const s = z
      .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
      .parse(req.body);
    const [v] = await db
      .update(vehicles)
      .set(s)
      .where(eq(vehicles.id, req.params.id))
      .returning();
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    await audit(req.user.id, "ADMIN_VEHICLE_UPDATED", "vehicle", v.id, s);
    res.json({ vehicle: v });
  }),
);
app.get(
  "/api/admin/alerts",
  auth,
  admin,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const data = await db
      .select({ alert: alerts, vehicle: vehicles })
      .from(alerts)
      .innerJoin(vehicles, eq(alerts.vehicleId, vehicles.id))
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ data, page, limit });
  }),
);
app.get(
  "/api/admin/notifications",
  auth,
  admin,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const data = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ data, page, limit });
  }),
);
app.get(
  "/api/admin/audit-logs",
  auth,
  admin,
  wrap(async (req, res) => {
    const { page, limit } = pageParams(req);
    const data = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ data, page, limit });
  }),
);
app.use((req, res) =>
  res.status(404).json({ error: "Route not found", requestId: req.id }),
);
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: "Validation failed",
        details: err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
  if (err?.code === "23505")
    return res
      .status(409)
      .json({ error: "A record with this value already exists" });
  console.error(
    JSON.stringify({
      requestId: req.id,
      event: "request_error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    }),
  );
  res.status(500).json({ error: "Internal server error", requestId: req.id });
});
const server = app.listen(port, () =>
  console.info(
    JSON.stringify({
      event: "api_started",
      port,
      environment: process.env.NODE_ENV || "development",
    }),
  ),
);
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.warn(
      `API port ${port} is already in use. Reuse the existing server, or stop it before starting another copy.`,
    );
    process.exit(0);
  }
  console.error("API server failed to start:", error);
  process.exit(1);
});
async function shutdown() {
  server.close();
  try {
    await pool.end();
    await redis?.quit();
  } finally {
    process.exit(0);
  }
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
