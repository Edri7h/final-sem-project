import { appendAuditLog } from "../repositories/audit.repository.js";
import {
  getAdminOverview,
  listAdminAlerts,
  listAdminUsers,
  listAdminVehicles,
  listAuditLogs,
  listAlertsForOwner,
  listNotifications,
  setOwnedAlertStatus,
  updateAdminUser,
  updateAdminVehicle,
} from "../repositories/alert.repository.js";

export const listOwnerAlerts = (ownerId, page, limit) =>
  listAlertsForOwner(ownerId, page, limit);

export const updateOwnerAlertStatus = (alertId, ownerId, actorId, status) =>
  setOwnedAlertStatus(alertId, ownerId, actorId, status);

export const getAdminDashboard = () => getAdminOverview();
export const getAdminUsers = (search, page, limit) =>
  listAdminUsers(search, page, limit);
export const getAdminVehicles = (page, limit) => listAdminVehicles(page, limit);
export const getAdminAlerts = (page, limit) => listAdminAlerts(page, limit);
export const getAdminNotifications = (page, limit) =>
  listNotifications(page, limit);
export const getAdminAuditLogs = (page, limit) => listAuditLogs(page, limit);

export async function changeAdminUser(actorId, userId, values) {
  if (actorId === userId && values.isActive === false) {
    return { forbidden: true };
  }
  const user = await updateAdminUser(userId, values);
  if (!user) return null;
  await appendAuditLog(actorId, "ADMIN_USER_UPDATED", "user", user.id, values);
  return user;
}

export async function changeAdminVehicle(actorId, vehicleId, values) {
  const vehicle = await updateAdminVehicle(vehicleId, values);
  if (!vehicle) return null;
  await appendAuditLog(
    actorId,
    "ADMIN_VEHICLE_UPDATED",
    "vehicle",
    vehicle.id,
    values,
  );
  return vehicle;
}
