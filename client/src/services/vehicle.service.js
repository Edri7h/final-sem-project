import { api } from "../api.js";

const json = (body) => JSON.stringify(body);

export const getVehicles = () => api("/api/vehicles");
export const createVehicle = (details) =>
  api("/api/vehicles", { method: "POST", body: json(details) });
export const updateVehicle = (id, details) =>
  api(`/api/vehicles/${id}`, { method: "PATCH", body: json(details) });
export const deactivateVehicle = (id) =>
  api(`/api/vehicles/${id}`, { method: "DELETE" });
export const regenerateVehicleQr = (id) =>
  api(`/api/vehicles/${id}/qr/regenerate`, { method: "POST" });
export const getVehicleQr = (id) =>
  api(`/api/vehicles/${id}/qr.png`, { responseType: "blob" });
