import { z } from "zod";
import { issueSessionCookie, revokeSession } from "../middleware/auth.js";
import {
  authenticateAccount,
  changeAccountPassword,
  registerAccount,
  resendAccountVerification,
  updateAccount,
  verifyAccountPhone,
} from "../services/account.service.js";
import {
  emailSchema as email,
  passwordSchema as password,
  phoneSchema as phone,
} from "../validators.js";

function developmentOtpPayload(delivery) {
  return process.env.NODE_ENV === "development" &&
    !process.env.SMS8_API_KEY?.trim() &&
    delivery?.devCode
    ? { developmentCode: delivery.devCode }
    : {};
}

export async function register(req, res) {
  const details = z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email,
      password,
      phone,
    })
    .parse(req.body);
  const { account, delivery } = await registerAccount(details);
  const sessionToken = issueSessionCookie(res, { ...account, role: "USER" });
  return res.status(201).json({
    user: { ...account, phoneVerified: false },
    verificationRequired: true,
    sessionToken,
    ...developmentOtpPayload(delivery),
  });
}

export async function login(req, res) {
  const credentials = z
    .object({ email, password: z.string().min(1) })
    .parse(req.body);
  const account = await authenticateAccount(
    credentials.email,
    credentials.password,
  );
  if (!account) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }

  const sessionToken = issueSessionCookie(res, account);
  return res.json({
    sessionToken,
    user: {
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      phoneVerified: account.phoneVerified,
      role: account.role,
    },
  });
}

export async function logout(req, res) {
  await revokeSession(req.token);
  res.clearCookie("session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  return res.json({ ok: true });
}

export function currentAccount(req, res) {
  return res.json({ user: req.user });
}

export async function verifyPhone(req, res) {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const verified = await verifyAccountPhone(req.user, code);
  if (!verified) {
    return res.status(400).json({ error: "Verification code is invalid or expired" });
  }
  return res.json({ verified: true });
}

export async function resendPhoneCode(req, res) {
  const delivery = await resendAccountVerification(req.user.phone);
  return res.json({ sent: true, ...developmentOtpPayload(delivery) });
}

export function readProfile(req, res) {
  return res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const values = z
    .object({
      fullName: z.string().trim().min(2).max(120).optional(),
      phone: phone.optional(),
    })
    .refine((value) => Object.keys(value).length > 0)
    .parse(req.body);
  const { account, delivery } = await updateAccount(req.user, values);
  return res.json({
    user: account,
    ...developmentOtpPayload(delivery),
  });
}

export async function updatePassword(req, res) {
  const values = z
    .object({ currentPassword: z.string(), newPassword: password })
    .parse(req.body);
  const changed = await changeAccountPassword(
    req.user.id,
    values.currentPassword,
    values.newPassword,
  );
  if (!changed) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  return res.json({ changed: true });
}
