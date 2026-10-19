import { ZodError } from "zod";
import { Sms8Error } from "../services/sms8.js";

export function notFoundHandler(req, res) {
  return res.status(404).json({ error: "Route not found", requestId: req.id });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err?.code === "23505") {
    return res.status(409).json({
      error: "A record with this value already exists",
    });
  }

  if (err instanceof Sms8Error) {
    const safeProviderMessage =
      err.code === 401
        ? "SMS8 rejected the API key. Check SMS8_API_KEY in the server environment."
        : err.code === 402
          ? "SMS8 has no message credits remaining."
          : err.code === 429
            ? "SMS8 is rate limiting requests. Wait before trying again."
            : "SMS delivery is temporarily unavailable. Please try again later.";
    console.error(
      JSON.stringify({
        requestId: req.id,
        event: "provider_error",
        provider: "sms8",
        providerCode: err.code,
      }),
    );
    return res.status(err.status || 502).json({
      error: safeProviderMessage,
      providerCode: err.code,
      requestId: req.id,
    });
  }

  console.error(
    JSON.stringify({
      requestId: req.id,
      event: "request_error",
      code: typeof err?.code === "string" ? err.code : undefined,
      message:
        process.env.NODE_ENV === "development"
          ? err?.message
          : "Unexpected server error",
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    }),
  );
  return res
    .status(500)
    .json({ error: "Internal server error", requestId: req.id });
}
