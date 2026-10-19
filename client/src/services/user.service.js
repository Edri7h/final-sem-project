import { api } from "../api.js";

export const updateProfile = (details) =>
  api("/api/users/profile", {
    method: "PATCH",
    body: JSON.stringify(details),
  });
export const changePassword = (details) =>
  api("/api/users/change-password", {
    method: "POST",
    body: JSON.stringify(details),
  });
