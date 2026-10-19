import { z } from "zod";
import {
  contactInputSchema,
  contactUpdateSchema,
  vehicleInputSchema,
} from "../validators.js";
import {
  createContact,
  createVehicle,
  deactivateVehicle,
  deleteOwnedContact,
  getVehicle,
  getVehicleQrPng,
  listContacts,
  listVehicles,
  regenerateVehicleQr,
  resendContactVerification,
  updateOwnedContact,
  updateVehicle,
  verifyOwnedContact,
} from "../services/vehicle.service.js";

function pageParams(query) {
  return {
    page: Math.max(1, Number(query.page) || 1),
    limit: Math.min(100, Math.max(1, Number(query.limit) || 20)),
  };
}

function developmentOtpPayload(delivery) {
  return process.env.NODE_ENV === "development" &&
    !process.env.SMS8_API_KEY?.trim() &&
    delivery?.devCode
    ? { developmentCode: delivery.devCode }
    : {};
}

export async function getVehicles(req, res) {
  const { page, limit } = pageParams(req.query);
  const data = await listVehicles(req.user.id, page, limit);
  return res.json({ data, page, limit });
}

export async function postVehicle(req, res) {
  const values = vehicleInputSchema.parse(req.body);
  const vehicle = await createVehicle(req.user.id, values);
  return res.status(201).json({ vehicle });
}

export async function getVehicleById(req, res) {
  const result = await getVehicle(req.user.id, req.params.id);
  if (!result) return res.status(404).json({ error: "Vehicle not found" });
  return res.json(result);
}

export async function patchVehicle(req, res) {
  const values = vehicleInputSchema
    .partial()
    .extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() })
    .parse(req.body);
  if (Object.keys(values).length === 0) {
    return res.status(400).json({ error: "Provide at least one vehicle field" });
  }
  const vehicle = await updateVehicle(req.user.id, req.params.id, values);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  return res.json({ vehicle });
}

export async function removeVehicle(req, res) {
  const vehicle = await deactivateVehicle(req.user.id, req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  return res.status(204).end();
}

export async function postRegenerateQr(req, res) {
  const result = await regenerateVehicleQr(req.user.id, req.params.id);
  if (!result) return res.status(404).json({ error: "Vehicle not found" });
  return res.json(result);
}

export async function getQrPng(req, res) {
  const png = await getVehicleQrPng(req.user.id, req.params.id);
  if (!png) return res.status(404).json({ error: "Vehicle not found" });
  return res.type("png").send(png);
}

export async function getContacts(req, res) {
  return res.json({ data: await listContacts(req.user.id) });
}

export async function postContact(req, res) {
  const values = contactInputSchema.parse(req.body);
  const result = await createContact(req.user.id, req.params.id, values);
  if (result.notFound) return res.status(404).json({ error: "Vehicle not found" });
  if (result.limitReached) {
    return res
      .status(409)
      .json({ error: "A vehicle can have at most 2 emergency contacts" });
  }
  return res.status(201).json({
    contact: result.contact,
    verificationRequired: true,
    ...developmentOtpPayload(result.delivery),
  });
}

export async function patchContact(req, res) {
  const values = contactUpdateSchema.parse(req.body);
  if (Object.keys(values).length === 0) {
    return res.status(400).json({ error: "Provide at least one contact field" });
  }
  const result = await updateOwnedContact(req.user.id, req.params.id, values);
  if (!result) return res.status(404).json({ error: "Contact not found" });
  return res.json({
    contact: result.contact,
    ...developmentOtpPayload(result.delivery),
  });
}

export async function postResendContactCode(req, res) {
  const result = await resendContactVerification(req.user.id, req.params.id);
  if (!result) return res.status(404).json({ error: "Contact not found" });
  return res.json({ sent: true, ...developmentOtpPayload(result.delivery) });
}

export async function postVerifyContact(req, res) {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const result = await verifyOwnedContact(req.user.id, req.params.id, code);
  if (result.notFound) return res.status(404).json({ error: "Contact not found" });
  if (!result.verified) {
    return res.status(400).json({ error: "Verification code is invalid or expired" });
  }
  return res.json({ verified: true });
}

export async function removeContact(req, res) {
  const removed = await deleteOwnedContact(req.user.id, req.params.id);
  if (!removed) return res.status(404).json({ error: "Contact not found" });
  return res.status(204).end();
}
