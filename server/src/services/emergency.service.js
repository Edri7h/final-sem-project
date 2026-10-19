import { sendAlertSms } from "./sms8.js";
import {
  createAlertAndNotificationRecords,
  findActiveVehicleByQrToken,
  findEmergencyCardVehicle,
  recordEmergencyAudit,
  updateNotificationRecord,
} from "../repositories/emergency.repository.js";

export async function getEmergencyCard(token) {
  const vehicle = await findEmergencyCardVehicle(token);
  if (!vehicle) return null;

  return {
    vehicle: {
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      description: vehicle.description,
      registrationNumber: vehicle.registrationNumber,
    },
    emergencyTypes: ["ACCIDENT", "MEDICAL", "FIRE", "BREAKDOWN", "OTHER"],
  };
}

export async function createConfirmedEmergencyAlert(token, submission) {
  const vehicle = await findActiveVehicleByQrToken(token);
  if (!vehicle) return null;

  const persisted = await createAlertAndNotificationRecords(vehicle, submission);
  const deliveryStatuses = [];
  const notificationsByContact = new Map(
    persisted.notifications.map((notification) => [
      notification.contactId,
      notification,
    ]),
  );

  for (const contact of persisted.contacts) {
    const notification = notificationsByContact.get(contact.id);
    if (!notification) {
      console.error(
        JSON.stringify({
          event: "notification_record_missing",
          alertId: persisted.alert.id,
          contactId: contact.id,
        }),
      );
      deliveryStatuses.push("FAILED");
      continue;
    }
    let status = "FAILED";
    let providerSid = null;
    let error = null;

    try {
      const delivery = await sendAlertSms(
        contact.phone,
        formatEmergencyMessage(vehicle, submission),
      );
      providerSid = delivery.providerId;
      status = delivery.status;
    } catch (deliveryError) {
      error = deliveryError.message;
      console.error(
        JSON.stringify({
          event: "sms_delivery_failed",
          alertId: persisted.alert.id,
          contactId: contact.id,
          message: error,
        }),
      );
    }

    await updateNotificationRecord(notification.id, {
      status,
      providerSid,
      error,
    });
    deliveryStatuses.push(status);
  }

  await recordEmergencyAudit(persisted.alert.id, submission.type);

  const failed = deliveryStatuses.some((status) => status === "FAILED");
  const pending = deliveryStatuses.some((status) => status === "PENDING");
  const allSent = deliveryStatuses.every((status) => status === "SENT");
  return {
    alert: {
      id: persisted.alert.id,
      type: persisted.alert.type,
      status: persisted.alert.status,
      createdAt: persisted.alert.createdAt,
      latitude: persisted.alert.latitude,
      longitude: persisted.alert.longitude,
    },
    contacts: persisted.contacts.map(({ name, phone }) => ({ name, phone })),
    notificationStatus:
      deliveryStatuses.length === 0
        ? "NO_VERIFIED_CONTACTS"
        : failed
          ? "FAILED"
          : allSent
            ? "SENT"
            : "PENDING",
    message:
      deliveryStatuses.length === 0
        ? "No verified emergency contacts are configured for this vehicle."
        : failed
          ? "Emergency alert was recorded, but one or more SMS notifications failed."
          : pending
            ? "SMS8 accepted the notification request. Delivery is not confirmed yet."
            : "Emergency alert recorded and SMS sent.",
  };
}

function formatEmergencyMessage(vehicle, submission) {
  const location =
    submission.latitude != null
      ? `Location: https://maps.google.com/?q=${submission.latitude},${submission.longitude}`
      : "Location unavailable";
  return `EMERGENCY: ${submission.type} involving ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}). ${submission.description || ""} ${location}`;
}
