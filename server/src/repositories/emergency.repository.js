import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import {
  alerts,
  alertEvents,
  auditLogs,
  contacts,
  notifications,
  vehicles,
} from "../schema.js";

export async function findActiveVehicleByQrToken(token) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.qrToken, token), eq(vehicles.status, "ACTIVE")))
    .limit(1);
  return vehicle;
}

export async function findEmergencyCardVehicle(token) {
  const [vehicle] = await db
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
    .where(eq(vehicles.qrToken, token))
    .limit(1);
  return vehicle?.status === "ACTIVE" ? vehicle : null;
}

export async function createAlertAndNotificationRecords(vehicle, submission) {
  return db.transaction(async (tx) => {
    const [alert] = await tx
      .insert(alerts)
      .values({
        vehicleId: vehicle.id,
        type: submission.type,
        description: submission.description || null,
        latitude:
          submission.latitude == null ? null : String(submission.latitude),
        longitude:
          submission.longitude == null ? null : String(submission.longitude),
        locationAccuracy:
          submission.locationAccuracy == null
            ? null
            : String(submission.locationAccuracy),
      })
      .returning();

    await tx.insert(alertEvents).values({
      alertId: alert.id,
      eventType: "EMERGENCY_CREATED",
      details: {
        type: submission.type,
        hasLocation: submission.latitude != null,
      },
    });

    const verifiedContacts = await tx
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.vehicleId, vehicle.id),
          eq(contacts.verified, true),
        ),
      );

    const notificationRecords = verifiedContacts.length
      ? await tx
          .insert(notifications)
          .values(
            verifiedContacts.map((contact) => ({
              alertId: alert.id,
              contactId: contact.id,
              destination: contact.phone,
              status: "PENDING",
            })),
          )
          .returning()
      : [];

    return { alert, contacts: verifiedContacts, notifications: notificationRecords };
  });
}

export async function updateNotificationRecord(id, result) {
  await db
    .update(notifications)
    .set({
      status: result.status,
      providerSid: result.providerSid,
      error: result.error,
    })
    .where(eq(notifications.id, id));
}

export async function recordEmergencyAudit(alertId, type) {
  await db.insert(auditLogs).values({
    userId: null,
    action: "EMERGENCY_CREATED",
    entity: "alert",
    entityId: alertId,
    metadata: { type },
  });
}
