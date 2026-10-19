import { z } from "zod";
import {
  changeAdminUser,
  changeAdminVehicle,
  getAdminAlerts,
  getAdminAuditLogs,
  getAdminDashboard,
  getAdminNotifications,
  getAdminUsers,
  getAdminVehicles,
  listOwnerAlerts,
  updateOwnerAlertStatus,
} from "../services/alert.service.js";

function pageParams(query) {
  return {
    page: Math.max(1, Number(query.page) || 1),
    limit: Math.min(100, Math.max(1, Number(query.limit) || 20)),
  };
}

export async function getAlerts(req, res) {
  const { page, limit } = pageParams(req.query);
  const data = await listOwnerAlerts(req.user.id, page, limit);
  return res.json({ data, page, limit });
}

export async function patchAlertStatus(req, res) {
  const { status } = z
    .object({ status: z.enum(["ACKNOWLEDGED", "RESOLVED"]) })
    .parse(req.body);
  const alert = await updateOwnerAlertStatus(
    req.params.id,
    req.user.id,
    req.user.id,
    status,
  );
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  return res.json({ alert });
}

export async function getAdminOverview(req, res) {
  return res.json(await getAdminDashboard());
}

export async function getUsers(req, res) {
  const { page, limit } = pageParams(req.query);
  const search = String(req.query.search || "");
  const data = await getAdminUsers(search, page, limit);
  return res.json({ data, page, limit });
}

export async function patchUser(req, res) {
  const values = z
    .object({
      isActive: z.boolean().optional(),
      role: z.enum(["USER", "ADMIN"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0)
    .parse(req.body);
  const user = await changeAdminUser(req.user.id, req.params.id, values);
  if (user?.forbidden) {
    return res.status(400).json({ error: "You cannot disable your own account" });
  }
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
}

export async function getVehicles(req, res) {
  const { page, limit } = pageParams(req.query);
  const data = await getAdminVehicles(page, limit);
  return res.json({ data, page, limit });
}

export async function patchVehicle(req, res) {
  const values = z
    .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
    .parse(req.body);
  const vehicle = await changeAdminVehicle(req.user.id, req.params.id, values);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  return res.json({ vehicle });
}

export async function getAdminAlertList(req, res) {
  const { page, limit } = pageParams(req.query);
  const data = await getAdminAlerts(page, limit);
  return res.json({ data, page, limit });
}

export async function getNotificationList(req, res) {
  const { page, limit } = pageParams(req.query);
  const data = await getAdminNotifications(page, limit);
  return res.json({ data, page, limit });
}

export async function getAuditLogList(req, res) {
  const { page, limit } = pageParams(req.query);
  const data = await getAdminAuditLogs(page, limit);
  return res.json({ data, page, limit });
}
