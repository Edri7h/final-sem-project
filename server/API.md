# HTTP API Reference

All bodies and responses use JSON except QR PNG downloads. Authentication accepts the session HTTP-only cookie or a `Bearer` JWT. Register and login return `sessionToken` for clients that cannot use cross-site cookies; browser clients must keep it in memory and rely on the HTTP-only cookie for restoration after a page reload. Authenticated routes require a valid session; vehicle and contact routes require a phone-verified account. Admin routes require ADMIN. Common errors: 400 validation, 401 unauthenticated, 403 role or verification denied, 404 unavailable/not owned, 409 duplicate/capacity conflict, 429 rate limited, 500 unexpected error. Validation responses include details with field and message.

| Method | Path | Access | Request | Success and errors |
| --- | --- | --- | --- | --- |
| POST | /api/auth/register | Public, rate limited | fullName, email, password (12+ chars incl. upper/lower/number/symbol), phone (E.164) | 201 user and verificationRequired; 400, 409 |
| POST | /api/auth/login | Public, rate limited | email, password | 200 user and cookie; 401 |
| POST | /api/auth/logout | Auth | none | 200 ok; revokes cookie |
| GET | /api/auth/me | Auth | none | 200 current user |
| POST | /api/auth/verify-phone | Auth, OTP limited | six digit code | 200 verified; 400 |
| POST | /api/auth/resend-code | Auth, OTP limited | none | 200 sent |
| GET | /api/users/profile | Auth | none | 200 user |
| PATCH | /api/users/profile | Auth | fullName?, phone? | 200 user; phone change resets verification |
| POST | /api/users/change-password | Auth | currentPassword, newPassword | 200 changed; 400 |
| GET | /api/vehicles?page=1&limit=20 | Verified owner | pagination query | 200 data/page/limit |
| POST | /api/vehicles | Verified owner | registrationNumber, make, model, color, description? | 201 vehicle with random QR token; 400, 409 |
| GET | /api/vehicles/:id | Verified owner | none | 200 vehicle and contacts; 404 if not owned |
| PATCH | /api/vehicles/:id | Verified owner | vehicle fields and/or status ACTIVE/INACTIVE | 200 vehicle |
| DELETE | /api/vehicles/:id | Verified owner | none | 204; deactivates QR |
| POST | /api/vehicles/:id/qr/regenerate | Verified owner | none | 200 token and URL |
| GET | /api/vehicles/:id/qr.png | Verified owner | none | 200 image/png |
| GET | /api/contacts | Verified owner | none | 200 contacts |
| POST | /api/vehicles/:id/contacts | Verified owner, OTP limited | name, phone, relationship? | 201 contact and verificationRequired; 409 at two contacts |
| PATCH | /api/contacts/:id | Verified owner | name?, phone?, relationship? | 200 contact |
| POST | /api/contacts/:id/resend-verify | Verified owner, OTP limited | none | 200 sent |
| POST | /api/contacts/:id/verify | Verified owner, OTP limited | six digit code | 200 verified; 400 |
| DELETE | /api/contacts/:id | Verified owner | none | 204 |
| GET | /api/emergency/:token | Public | random QR token | 200 limited vehicle and emergency types; 404 unknown/inactive |
| POST | /api/emergency/:token/alerts | Public, rate limited | type, confirmed:true, description?, latitude?, longitude?, locationAccuracy? | 201 alert, notificationStatus and message; 400 invalid/unconfirmed; 404 unavailable |
| GET | /api/alerts?page=1&limit=20 | Verified owner | pagination query | 200 owner alert history |
| PATCH | /api/alerts/:id/status | Verified owner | status ACKNOWLEDGED or RESOLVED | 200 alert; 404 not owned |
| GET | /api/hospitals?latitude=…&longitude=… | Public | coordinates | 200 nearby places; 503 provider unavailable |
| GET | /api/admin/overview | Admin | none | 200 aggregate counts |
| GET | /api/admin/users?page=1&limit=20&search=… | Admin | pagination and optional search | 200 user records (no password hashes) |
| PATCH | /api/admin/users/:id | Admin | isActive?, role? | 200 user; self-disable rejected |
| GET | /api/admin/vehicles?page=1&limit=20 | Admin | pagination query | 200 vehicle records |
| PATCH | /api/admin/vehicles/:id | Admin | status ACTIVE/INACTIVE | 200 vehicle |
| GET | /api/admin/alerts?page=1&limit=20 | Admin | pagination query | 200 alert records |
| GET | /api/admin/notifications?page=1&limit=20 | Admin | pagination query | 200 notification records |
| GET | /api/admin/audit-logs?page=1&limit=20 | Admin | pagination query | 200 audit records |
| GET | /health | Public | none | 200 healthy or 503 database degraded |
| GET | /api/docs | Public | none | OpenAPI 3 JSON |

## Emergency request example

    { "type": "ACCIDENT", "description": "Vehicle blocking east lane", "confirmed": true, "latitude": 37.7749, "longitude": -122.4194, "locationAccuracy": 8.2 }

Latitude and longitude are optional but must be provided together. Confirmation must be literal true; scanning never creates an alert. The alert, event, and pending notification rows are written before SMS8 is called. notificationStatus is SENT, PENDING, FAILED, or NO_VERIFIED_CONTACTS, and failure or unconfirmed delivery is stated explicitly in the response.
