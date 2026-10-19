import axios from "axios";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:4000"
    : "https://final-sem-project-mzm4.onrender.com")
).replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

let sessionToken = null;

export const setSessionToken = (token) => {
  sessionToken = typeof token === "string" && token ? token : null;
};

export const clearSessionToken = () => {
  sessionToken = null;
};

apiClient.interceptors.request.use((config) => {
  if (sessionToken) config.headers.Authorization = `Bearer ${sessionToken}`;
  return config;
});

export class ApiError extends Error {
  constructor(message, { status = 0, code, details = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const knownMessages = [
  "Authentication required",
  "Session expired",
  "Invalid or expired session",
  "Account unavailable",
  "Invalid request origin",
  "Email or password is incorrect",
  "Verification code is invalid or expired",
  "Current password is incorrect",
  "Verify your phone before managing vehicles and contacts",
  "A vehicle can have at most 2 emergency contacts",
  "Vehicle not found",
  "Contact not found",
  "Alert not found",
  "User not found",
  "You cannot disable your own account",
  "Administrator access required",
  "This emergency QR is unavailable",
  "Nearby hospital search is temporarily unavailable.",
  "SMS8 rejected the API key. Check SMS8_API_KEY in the server environment.",
  "SMS8 has no message credits remaining.",
  "SMS8 is rate limiting requests. Wait before trying again.",
  "Unable to complete the request. Please try again later.",
];

function safeMessage(error) {
  const status = error.response?.status;
  const serverMessage = error.response?.data?.error;

  if (serverMessage && knownMessages.includes(serverMessage)) {
    return serverMessage;
  }
  if (typeof serverMessage === "string" && error.response?.data?.providerCode) {
    return "SMS8 could not send the verification code. Check the server's SMS8 configuration and device connection.";
  }
  if (status === 400) return "Please check the information and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested information could not be found.";
  if (status === 409) return "This information is already in use.";
  if (status === 429) return "Too many attempts. Please wait and try again.";
  if (status >= 500) return "Something went wrong. Please try again later.";
  if (!error.response) {
    return error.code === "ECONNABORTED"
      ? "The request timed out. Please try again."
      : "Unable to connect. Check your internet connection and try again.";
  }
  return "The request could not be completed. Please try again.";
}

export async function api(path, options = {}) {
  const { body, ...config } = options;

  try {
    const response = await apiClient.request({
      url: path,
      data: body,
      ...config,
      withCredentials: true,
      headers: { "Content-Type": "application/json", ...config.headers },
    });
    return response.status === 204 ? null : response.data;
  } catch (error) {
    const data = error.response?.data;
    const details = Array.isArray(data?.details)
      ? data.details
          .filter(
            (item) =>
              typeof item?.field === "string" &&
              typeof item?.message === "string" &&
              item.message.length < 120,
          )
          .map(({ field }) => ({
            field,
            message:
              field === "email"
                ? "Enter a valid email address."
                : field === "password" || field === "newPassword"
                  ? "Password does not meet the requirements."
                  : field === "phone"
                    ? "Enter a valid phone number."
                    : field === "code"
                      ? "Enter the 6-digit verification code."
                      : "Check this field and try again.",
          }))
      : [];
    const message = details.length
      ? `${safeMessage(error)} ${details
          .map((item) => `${item.field}: ${item.message}`)
          .join(" ")}`
      : safeMessage(error);
    throw new ApiError(message, {
      status: error.response?.status,
      code: typeof data?.code === "string" ? data.code : undefined,
      details,
    });
  }
}
