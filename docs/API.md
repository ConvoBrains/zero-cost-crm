# HTTP API

Base URL: same origin as the app, or `http://localhost:4000` in development.

Unless noted, endpoints require `Authorization: Bearer <jwt>`.

## Public

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/health` | Liveness `{ ok: true }` |
| `GET` | `/api/config` | `{ allowedEmailDomain, allowedEmailDomains, allowAnyEmailDomain }` |

## Auth

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/auth/login` | `{ email, password }` → `{ token, user }` (rate limited) |
| `POST` | `/api/auth/logout` | End session `{ reason? }` |
| `POST` | `/api/auth/heartbeat` | Touch active session |
| `GET` | `/api/auth/me` | Current user |

## Users (admin / founder)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/users/roles` | Allowed roles |
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user `{ name, email, password, role }` |

## CRM

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/bootstrap` | Companies + contacts |
| `GET` | `/api/metrics` | Dashboard counters |
| `POST` | `/api/companies` | Create company |
| `PATCH` | `/api/companies/:id` | Update company |
| `DELETE` | `/api/companies/:id` | Delete (admin) |
| `POST` | `/api/contacts` | Create contact |
| `PATCH` | `/api/contacts/:id` | Update contact |
| `DELETE` | `/api/contacts/:id` | Delete (admin) |
| `POST` | `/api/import/prospects` | Bulk import `{ rows: ProspectRow[] }` |

## Conversations (recordings)

Requires AWS env vars. See `.env.example`.

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/conversations/presign` | Start upload |
| `POST` | `/api/conversations/:id/complete` | Finalize upload |
| `GET` | `/api/conversations` | List (`contactId` / `companyId` query) |
| `GET` | `/api/conversations/:id/play` | Presigned play URL |
| `DELETE` | `/api/conversations/:id` | Delete (admin) |

## Activity (admin / founder)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/activity/sdrs` | SDR roster |
| `GET` | `/api/activity/targets` | Daily targets |
| `PATCH` | `/api/activity/targets` | Update targets |
| `POST` | `/api/activity/events` | Client-side activity event |
| `GET` | `/api/activity/overview` | Manager overview |
| `GET` | `/api/activity/timeline` | Event timeline |
| `GET` | `/api/activity/lead/:entityType/:id` | Lead-centric activity |

## Errors

JSON body: `{ "error": "message" }` with appropriate HTTP status (`400`, `401`, `403`, `404`, `409`, `429`, `500`).
