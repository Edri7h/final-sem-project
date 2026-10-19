import { api } from "../api.js";

export const getEmergencyCard = (token) => api(`/api/emergency/${token}`);
export const createEmergencyAlert = (token, details) =>
  api(`/api/emergency/${token}/alerts`, {
    method: "POST",
    body: JSON.stringify(details),
  });
export const searchNearbyHospitals = (query) =>
  api(`/api/hospitals?${query}`);
