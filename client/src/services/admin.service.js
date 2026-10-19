import { api } from "../api.js";

export const getAdminResource = (resource, query = "") =>
  api(`/api/admin/${resource}${query}`);
export const updateAdminUser = (id, details) =>
  api(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(details),
  });
export const updateAdminVehicle = (id, details) =>
  api(`/api/admin/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(details),
  });
