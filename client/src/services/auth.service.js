import { api } from "../api.js";

const json = (body) => JSON.stringify(body);

export const getCurrentUser = () => api("/api/auth/me");
export const register = (details) =>
  api("/api/auth/register", { method: "POST", body: json(details) });
export const login = (credentials) =>
  api("/api/auth/login", { method: "POST", body: json(credentials) });
export const logout = () => api("/api/auth/logout", { method: "POST" });
export const verifyAccountPhone = (code) =>
  api("/api/auth/verify-phone", { method: "POST", body: json({ code }) });
export const resendAccountCode = () =>
  api("/api/auth/resend-code", { method: "POST" });
