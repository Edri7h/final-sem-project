# Beacon — QR-Based Emergency Assistance

A vehicle emergency QR application built with React, Express, PostgreSQL, and Drizzle ORM. Vehicle owners register emergency contacts and generate a random public QR URL. A bystander can scan it, review limited vehicle details, request browser location, select the incident type, and explicitly confirm an alert. Alerts are persisted before SMS delivery is attempted, so provider failures never erase the report.

## Features

- JWT login, logout, current-user endpoint, Argon2id password hashes, account roles, and phone verification through SMS8 OTP. Sessions use an HTTP-only cookie; the client keeps its short-lived bearer compatibility token in memory only.
- Owner-scoped multi-vehicle management, random QR tokens, PNG QR downloads, two-contact limit, and contact verification.
- Mobile public emergency form. Scanning never sends an alert; an explicit checkbox and button are required. Location is optional and includes browser-reported accuracy.
- PostgreSQL alert history, event history, lifecycle updates, SMS delivery records, audit logs, admin APIs, and health check.
- SMS8 SMS adapter for emergency alerts and phone verification. SMS8 sends through an Android phone paired to the SMS8 account.
- Nearby hospital search through OpenStreetMap Overpass, with a provider boundary and graceful outage response.
- Redis connection health and session revocation when configured; PostgreSQL remains the source of truth.

## Architecture

`client/` is the React/Vite application, using React Router, Redux Toolkit, and product-specific CSS. UI pages/components call feature modules in `client/src/services/`; `client/src/api.js` owns Axios configuration, credentials, timeout, in-memory bearer compatibility, and safe error mapping. The Express app is created in `server/src/app.js`, started by `server/src/server.js`, with route modules, controllers, feature services, and repositories separated under `server/src/`. Authentication middleware and centralized error handling live in `middleware/`. Drizzle tables are in `schema.js`, validation in `validators.js`, and SMS8 and QR integrations in `services/`. PostgreSQL stores users, vehicles, emergency contacts, alerts, alert events, SMS notifications, and audit logs. `server/src/openapi.js` describes the API; visit `/api/docs` for the OpenAPI JSON.

## Requirements and configuration

Node.js 20+, PostgreSQL 14+, and npm. Redis is optional locally. Configure SMS8 and pair an online Android phone with an active SIM for real SMS delivery and phone verification.

Copy `server/.env.example` to `server/.env`; set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters. Never commit `.env` or real credentials.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` enables local OTP fallback when SMS8 is not configured; production disables it |
| `PORT` | Express port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection URL |
| `REDIS_URL` | Optional Redis connection URL |
| `JWT_SECRET` | Signing secret for HTTP-only session cookie |
| `FRONTEND_URL` | Allowed browser origins for CORS and mutation-origin checks |
| `BACKEND_URL` | API URL in OpenAPI documentation |
| `SMS8_API_KEY` | Server-only SMS8 API key used for SMS alerts and OTP verification |
| `HOSPITAL_PROVIDER` | Provider selection; current implementation is `overpass` |
| `HOSPITAL_API_KEY` | Reserved for a keyed provider; Overpass does not need one |
| `VITE_API_URL` | Optional client API origin; defaults to localhost in development and the configured Render API in production |
| `SEED_PASSWORD` | Optional development seed password override |

## Local development

1. Create PostgreSQL database `qr_emergency` and optionally start Redis.
2. Copy `server/.env.example` to `server/.env` and set configuration.
3. Install each app with `npm install --prefix server` and `npm install --prefix client`.
4. Generate and apply migrations with `npm --prefix server run db:generate` and `npm --prefix server run db:migrate`.
5. Add fake development records with `npm --prefix server run db:seed`.
6. Start both apps with `npm --prefix server run dev:all`.

Client: `http://localhost:5173`; API: `http://localhost:4000`. `GET /health` reports API, database, and Redis state. `GET /api/docs` returns the OpenAPI JSON.

### Development OTP and seed accounts

Without an SMS8 API key in development, the development fallback returns the OTP only in local registration/resend/contact API responses and the UI displays it for local testing. Codes expire after five minutes; they are never written to logs and the fallback is disabled in production. It is not a simulated SMS. Seed accounts are `alex@example.test`, `jordan@example.test`, and `admin@example.test`; their default password is `Beacon-Development-Only-2026!` unless `SEED_PASSWORD` is set. Seed contacts are unverified. All seed data is fake; do not reuse credentials outside development.

### SMS8 delivery requirements

SMS8 routes messages through an Android phone paired to your SMS8 account. Keep that phone powered, online, and connected to a working SIM. Set `SMS8_API_KEY` in the Render server environment and in `server/.env` for local development; never put it in the frontend or commit it. If SMS8 is unavailable, emergency alerts are still stored and notification attempts are recorded as `FAILED` with an error. SMS8 may accept a message as `Pending`; the API acceptance does not itself prove delivery to the recipient.

### Hospital provider

The adapter searches nearby hospitals through the public Overpass API. It needs internet access and may be rate limited. A provider failure returns `503` and does not interrupt emergency reporting. Replace `server/src/services/hospitals.js` to adopt a keyed provider.

## Database and commands

Schema: `server/src/schema.js`; migration configuration: `server/drizzle.config.js`.

- `npm --prefix server run db:generate` — create a migration from schema changes.
- `npm --prefix server run db:migrate` — apply pending migrations.
- `npm --prefix server run db:seed` — insert fake development records.
- `npm --prefix server test` — run validation tests.
- `npm --prefix client run build` — build the frontend production bundle.

No pre-generated dataset is used; PostgreSQL is the application data source.

## API outline

- `/api/auth`: register, login, logout, session, account-phone verification/resend.
- `/api/users`: profile read/update and password change.
- `/api/vehicles`: owner-scoped vehicle management, QR regeneration/download, contact management.
- `/api/emergency/:token`: limited public QR lookup and confirmed report submission.
- `/api/alerts`: owner history and acknowledge/resolve lifecycle.
- `/api/hospitals`: nearby search from coordinates.
- `/api/admin/*`: protected overview, users, vehicles, alerts, notification records, audit logs.
- `/health`: dependency status; `/api/docs`: OpenAPI JSON.

JSON API errors use `{ "error": "..." }`; validation responses also include field details. List routes accept `page` and `limit` (maximum 100). Sessions use an HTTP-only cookie and accept the existing bearer-token compatibility path used by the deployed web client. Cookies are Secure and SameSite=None in production, and SameSite=Lax in local development. Mutations enforce origin checks when an Origin header is present, and CORS uses `FRONTEND_URL`. Auth and public emergency submission are rate limited.

## Deployment preparation

Build the frontend with `npm --prefix client run build` and deploy `client/dist` to Vercel with the project root set to `client/`. Deploy the Node API on Render with the project root set to `server/` (build: `npm install`; start: `npm start`, which runs `src/server.js`). Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL=https://beacon-emergency.vercel.app`, `BACKEND_URL`, and `SMS8_API_KEY`. Redis is optional. Use HTTPS. Apply migrations as a release step before starting the API. For a different API host, set `VITE_API_URL` in the Vercel project environment and redeploy. The frontend calls the API host directly; it does not use a Vercel API proxy. No credentials are embedded in source.

The API temporarily accepts the previous Vercel origin for QR cards already printed with that hostname, if it still serves this frontend. Newly generated QR codes use `https://beacon-emergency.vercel.app`. Before retiring the old hostname, replace and reprint any existing QR cards that still point to it.

## Troubleshooting

- Database errors: verify URL, network access, database status, and migration state.
- Phone verification configuration error: set `SMS8_API_KEY` on the backend and ensure the SMS8 paired Android device is online; local development OTP appears in the API response when SMS8 is not configured.
- SMS provider configuration error: configure credentials and sender. Alert remains in history and delivery records.
- CORS/sign-in issue: `FRONTEND_URL` must exactly match the browser origin, including scheme and port.
- Hospital search unavailable: Overpass may be throttled or unreachable; retry later or switch provider.
- Production QR cards use the canonical Vercel frontend URL in the current app configuration. Re-download the card if an older QR contains a different host; the token does not need to be regenerated.


