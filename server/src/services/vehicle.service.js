import { appendAuditLog } from "../repositories/audit.repository.js";
import {
  deactivateOwnedVehicle,
  findOwnedContact,
  findOwnedVehicle,
  insertContactWithinVehicleLimit,
  insertVehicle,
  listOwnerContacts,
  listOwnerVehicles,
  listVehicleContacts,
  removeContact,
  updateContact,
  updateOwnedVehicle,
} from "../repositories/vehicle.repository.js";
import { frontendUrl } from "../config.js";
import { qrDataUrl, newQrToken } from "./qr.js";
import { checkPhoneVerification, startPhoneVerification } from "./sms8.js";

export const listVehicles = (ownerId, page, limit) =>
  listOwnerVehicles(ownerId, page, limit);

export async function createVehicle(ownerId, values) {
  const vehicle = await insertVehicle(ownerId, values, newQrToken());
  await appendAuditLog(ownerId, "VEHICLE_CREATED", "vehicle", vehicle.id);
  return vehicle;
}

export async function getVehicle(ownerId, id) {
  const vehicle = await findOwnedVehicle(id, ownerId);
  if (!vehicle) return null;
  return {
    vehicle,
    contacts: await listVehicleContacts(vehicle.id),
  };
}

export async function updateVehicle(ownerId, id, values) {
  return updateOwnedVehicle(id, ownerId, values);
}

export async function deactivateVehicle(ownerId, id) {
  const vehicle = await deactivateOwnedVehicle(id, ownerId);
  if (vehicle) {
    await appendAuditLog(ownerId, "VEHICLE_DEACTIVATED", "vehicle", vehicle.id);
  }
  return vehicle;
}

export async function regenerateVehicleQr(ownerId, id) {
  const updated = await updateOwnedVehicle(id, ownerId, {
    qrToken: newQrToken(),
  });
  if (!updated) return null;
  return {
    token: updated.qrToken,
    url: `${frontendUrl}/emergency/${updated.qrToken}`,
  };
}

export async function getVehicleQrPng(ownerId, id) {
  const vehicle = await findOwnedVehicle(id, ownerId);
  if (!vehicle) return null;
  const data = await qrDataUrl(vehicle.qrToken);
  return Buffer.from(data.split(",")[1], "base64");
}

export const listContacts = (ownerId) => listOwnerContacts(ownerId);

export async function createContact(ownerId, vehicleId, values) {
  const vehicle = await findOwnedVehicle(vehicleId, ownerId);
  if (!vehicle) return { notFound: true };

  const result = await insertContactWithinVehicleLimit(vehicleId, values);
  if (result.limitReached) return { limitReached: true };
  const delivery = await startPhoneVerification(result.contact.phone);
  return { contact: result.contact, delivery };
}

export async function updateOwnedContact(ownerId, id, values) {
  const row = await findOwnedContact(id, ownerId);
  if (!row) return null;

  const changes = { ...values };
  let delivery;
  if (changes.phone && changes.phone !== row.contact.phone) {
    changes.verified = false;
    delivery = await startPhoneVerification(changes.phone);
  }
  return {
    contact: await updateContact(row.contact.id, changes),
    delivery,
  };
}

export async function resendContactVerification(ownerId, id) {
  const row = await findOwnedContact(id, ownerId);
  if (!row) return null;
  const delivery = await startPhoneVerification(row.contact.phone);
  return { delivery };
}

export async function verifyOwnedContact(ownerId, id, code) {
  const row = await findOwnedContact(id, ownerId);
  if (!row) return { notFound: true };
  if (!(await checkPhoneVerification(row.contact.phone, code))) {
    return { verified: false };
  }
  await updateContact(row.contact.id, { verified: true });
  return { verified: true };
}

export async function deleteOwnedContact(ownerId, id) {
  const row = await findOwnedContact(id, ownerId);
  if (!row) return false;
  await removeContact(row.contact.id);
  return true;
}
