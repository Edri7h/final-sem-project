export const paths = {
  "/api/auth/register": {
    post: {
      summary: "Create account and begin phone verification",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["fullName", "email", "password", "phone"],
              properties: {
                fullName: { type: "string" },
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: 12 },
                phone: { type: "string", pattern: "^\\+[1-9]\\d{7,14}$" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Account created; verification required" },
        400: { description: "Validation error" },
        409: { description: "Email or phone is already in use" },
      },
    },
  },
  "/api/auth/login": {
    post: {
      summary: "Create secure cookie session",
      security: [],
      responses: {
        200: { description: "Signed in" },
        401: { description: "Invalid credentials" },
      },
    },
  },
  "/api/auth/logout": {
    post: {
      summary: "Revoke session",
      responses: {
        200: { description: "Signed out" },
        401: { description: "Not signed in" },
      },
    },
  },
  "/api/auth/me": {
    get: {
      summary: "Current user",
      responses: {
        200: { description: "Current authenticated user" },
        401: { description: "Not signed in" },
      },
    },
  },
  "/api/auth/verify-phone": {
    post: {
      summary: "Verify account phone with OTP",
      responses: {
        200: { description: "Verified" },
        400: { description: "Invalid or expired code" },
      },
    },
  },
  "/api/vehicles": {
    get: {
      summary: "List current user vehicles",
      responses: { 200: { description: "Paginated vehicles" } },
    },
    post: {
      summary: "Create vehicle",
      responses: {
        201: { description: "Vehicle with generated public token" },
        403: { description: "Phone verification required" },
      },
    },
  },
  "/api/vehicles/{id}": {
    get: {
      summary: "Vehicle detail and contacts",
      responses: {
        200: { description: "Vehicle" },
        404: { description: "Not found or not owned" },
      },
    },
    patch: {
      summary: "Update vehicle or status",
      responses: { 200: { description: "Updated vehicle" } },
    },
    delete: {
      summary: "Deactivate vehicle",
      responses: { 204: { description: "Deactivated" } },
    },
  },
  "/api/vehicles/{id}/qr.png": {
    get: {
      summary: "Download QR code PNG",
      responses: { 200: { description: "image/png" } },
    },
  },
  "/api/vehicles/{id}/contacts": {
    post: {
      summary: "Add a verified-by-OTP emergency contact (maximum two)",
      responses: {
        201: { description: "Contact created; phone verification required" },
        409: { description: "Contact limit reached" },
      },
    },
  },
  "/api/contacts/{id}": {
    patch: {
      summary: "Update owned contact",
      responses: { 200: { description: "Updated contact" } },
    },
    delete: {
      summary: "Delete owned contact",
      responses: { 204: { description: "Deleted" } },
    },
  },
  "/api/emergency/{token}": {
    get: {
      summary: "Public limited emergency card lookup",
      security: [],
      responses: {
        200: {
          description:
            "Vehicle display data and verified emergency contact dial links",
        },
        404: { description: "Unknown or inactive QR" },
      },
    },
  },
  "/api/emergency/{token}/alerts": {
    post: {
      summary: "Submit confirmed public emergency report",
      security: [],
      responses: {
        201: { description: "Persisted alert and notification outcomes" },
        400: { description: "Validation or missing confirmation" },
        404: { description: "Unknown or inactive QR" },
      },
    },
  },
  "/api/alerts": {
    get: {
      summary: "List current owner alert history",
      responses: { 200: { description: "Paginated alerts" } },
    },
  },
  "/api/alerts/{id}/status": {
    patch: {
      summary: "Acknowledge or resolve owned alert",
      responses: {
        200: { description: "Updated alert" },
        404: { description: "Not found or not owned" },
      },
    },
  },
  "/api/hospitals": {
    get: {
      summary: "Search nearby hospitals using coordinates",
      security: [],
      responses: {
        200: { description: "Nearby hospitals and map links" },
        503: { description: "Provider temporarily unavailable" },
      },
    },
  },
  "/api/admin/overview": {
    get: {
      summary: "Admin metrics",
      responses: {
        200: { description: "Aggregate counts" },
        403: { description: "Admin role required" },
      },
    },
  },
  "/api/admin/users": {
    get: {
      summary: "Search and page users",
      responses: { 200: { description: "Users without credential data" } },
    },
  },
  "/api/admin/vehicles": {
    get: {
      summary: "Page all vehicles",
      responses: { 200: { description: "Vehicle records" } },
    },
  },
  "/api/admin/alerts": {
    get: {
      summary: "Page all alerts",
      responses: { 200: { description: "Alerts" } },
    },
  },
  "/api/admin/notifications": {
    get: {
      summary: "Inspect SMS delivery records",
      responses: { 200: { description: "Notification outcomes" } },
    },
  },
  "/api/admin/audit-logs": {
    get: {
      summary: "Inspect audit events",
      responses: { 200: { description: "Audit records" } },
    },
  },
  "/health": {
    get: {
      summary: "API, PostgreSQL and Redis health status",
      security: [],
      responses: {
        200: { description: "Healthy" },
        503: { description: "Database degraded" },
      },
    },
  },
};
