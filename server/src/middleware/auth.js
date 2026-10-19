import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, redis } from "../db.js";
import { users } from "../schema.js";

const jwtSecret = process.env.JWT_SECRET;
const revokedLocal = new Map();

export function issueSessionCookie(res, user) {
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
  return token;
}

export async function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer || req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const revokedUntil = revokedLocal.get(token);
  if (revokedUntil && revokedUntil > Date.now()) {
    return res.status(401).json({ error: "Session expired" });
  }
  if (revokedUntil) revokedLocal.delete(token);

  let payload;
  try {
    if (redis?.status === "ready" && (await redis.get(`revoked:${token}`))) {
      return res.status(401).json({ error: "Session expired" });
    }
  } catch (error) {
    return next(error);
  }

  try {
    payload = jwt.verify(token, jwtSecret, { issuer: "qr-emergency" });
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  try {
    const [user] = await db
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

    if (!user?.isActive) {
      return res.status(401).json({ error: "Account unavailable" });
    }

    req.user = user;
    req.token = token;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Administrator access required" });
  }
  return next();
}

export function requireVerifiedPhone(req, res, next) {
  if (!req.user.phoneVerified) {
    return res
      .status(403)
      .json({ error: "Verify your phone before managing vehicles and contacts" });
  }
  return next();
}

export async function revokeSession(token) {
  if (redis?.status === "ready") {
    await redis.set(`revoked:${token}`, "1", "EX", 43200);
  } else {
    revokedLocal.set(token, Date.now() + 12 * 60 * 60 * 1000);
  }
}
