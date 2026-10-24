import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../.env") });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

export const productionFrontendUrl =
  "https://beacon-emergency.vercel.app";
const legacyFrontendUrl = "https://final-sem-project-chi.vercel.app";
const defaultFrontendUrl =
  process.env.NODE_ENV === "production"
    ? productionFrontendUrl
    : "http://localhost:5173";

export const frontendUrls = (process.env.FRONTEND_URL || defaultFrontendUrl)
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export const allowedFrontendOrigins = new Set([
  ...frontendUrls,
  productionFrontendUrl,
  legacyFrontendUrl,
]);

export const frontendUrl =
  process.env.NODE_ENV === "production"
    ? productionFrontendUrl
    : frontendUrls[0] || productionFrontendUrl;
