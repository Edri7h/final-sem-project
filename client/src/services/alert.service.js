import { api } from "../api.js";

export const getAlerts = () => api("/api/alerts");
export const updateAlertStatus = (id, details) =>
  api(`/api/alerts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(details),
  });
