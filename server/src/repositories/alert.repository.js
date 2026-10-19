import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db.js";
import {
  alertEvents,
  alerts,
  auditLogs,
  notifications,
  users,
  vehicles,
} from "../schema.js";

export async function listAlertsForOwner(ownerId, page, limit) {
  const rows = await db
    .select({ alert: alerts, vehicle: vehicles })
    .from(alerts)
    .innerJoin(vehicles, eq(alerts.vehicleId, vehicles.id))
    .where(eq(vehicles.ownerId, ownerId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  return rows.map(({ alert, vehicle }) => ({
    ...alert,
    vehicle: {
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
    },
  }));
}

export async function setOwnedAlertStatus(alertId, ownerId, actorUserId, status) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ alert: alerts, ownerId: vehicles.ownerId })
      .from(alerts)
      .innerJoin(vehicles, eq(alerts.vehicleId, vehicles.id))
      .where(eq(alerts.id, alertId))
      .for("update");
    if (!row || row.ownerId !== ownerId) return null;

    const [updated] = await tx
      .update(alerts)
      .set({ status })
      .where(eq(alerts.id, row.alert.id))
      .returning();
    await tx.insert(alertEvents).values({
      alertId: updated.id,
      actorUserId,
      eventType: status,
      details: { status },
    });
    await tx.insert(auditLogs).values({
      userId: actorUserId,
      action: `ALERT_${status}`,
      entity: "alert",
      entityId: updated.id,
      metadata: {},
    });
    return updated;
  });
}

export async function getAdminOverview() {
  const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
  const [vehicleCount] = await db.select({ count: sql`count(*)` }).from(vehicles);
  const [alertCount] = await db.select({ count: sql`count(*)` }).from(alerts);
  const [failedCount] = await db
    .select({ count: sql`count(*)` })
    .from(notifications)
    .where(eq(notifications.status, "FAILED"));
  return {
    users: Number(userCount.count),
    vehicles: Number(vehicleCount.count),
    alerts: Number(alertCount.count),
    failedNotifications: Number(failedCount.count),
  };
}

export async function listAdminUsers(search, page, limit) {
  const filter = search
    ? or(ilike(users.email, `%${search}%`), ilike(users.fullName, `%${search}%`))
    : undefined;
  return db
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
}

export async function updateAdminUser(userId, values) {
  const [user] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, userId))
    .returning({ id: users.id, isActive: users.isActive, role: users.role });
  return user;
}

export async function listAdminVehicles(page, limit) {
  return db
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
}

export async function updateAdminVehicle(vehicleId, values) {
  const [vehicle] = await db
    .update(vehicles)
    .set(values)
    .where(eq(vehicles.id, vehicleId))
    .returning();
  return vehicle;
}

export async function listAdminAlerts(page, limit) {
  return db
    .select({ alert: alerts, vehicle: vehicles })
    .from(alerts)
    .innerJoin(vehicles, eq(alerts.vehicleId, vehicles.id))
    .orderBy(desc(alerts.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function listNotifications(page, limit) {
  return db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function listAuditLogs(page, limit) {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}
