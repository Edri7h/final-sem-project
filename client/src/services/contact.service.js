import { api } from "../api.js";

const json = (body) => JSON.stringify(body);

export const getContacts = () => api("/api/contacts");
export const addContact = (vehicleId, details) =>
  api(`/api/vehicles/${vehicleId}/contacts`, {
    method: "POST",
    body: json(details),
  });
export const updateContact = (id, details) =>
  api(`/api/contacts/${id}`, { method: "PATCH", body: json(details) });
export const removeContact = (id) =>
  api(`/api/contacts/${id}`, { method: "DELETE" });
export const verifyContact = (id, code) =>
  api(`/api/contacts/${id}/verify`, { method: "POST", body: json({ code }) });
export const resendContactVerification = (id) =>
  api(`/api/contacts/${id}/resend-verify`, { method: "POST" });
