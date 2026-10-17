import axios from "axios";

const apiBaseUrl = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_URL || "http://localhost:4000"
    : "https://final-sem-project-mzm4.onrender.com"
).replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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
    const details = data?.details
      ?.map((item) => `${item.field}: ${item.message}`)
      .join("; ");
    throw new Error(
      details
        ? `${data?.error || "Request failed"} — ${details}`
        : data?.error || error.message || "Request failed",
    );
  }
}
