# HTTP API

Base URL: same origin as the app, or `http://localhost:4000` in development.

Unless noted, endpoints require `Authorization: Bearer <jwt>`.

## Public

| Method  | Path            | Description                                                                                                         |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/api/health`   | Liveness `{ ok: true }`                                                                                             |
| `GET`   | `/api/config`   | Public instance config: email policy + branding, stages, contactStatuses, championStatusToStage, discoveryQuestions |
| `PATCH` | `/api/settings` | Admin/founder: update branding + stages + contactStatuses (+ optional champion map / discoveryQuestions)            |

### Settings UI vs API-only

The **Settings** page in the app can edit:

- `brandName`, `brandTagline`, `logoUrl`
- `stages` (pipeline)
- `contactStatuses`

These two are **not** on that page yet (easy to miss — they’re not broken, just API/SQL only):

| Field | Purpose |
| ----- | ------- |
| `championStatusToStage` | When a champion’s contact status changes, optionally move the company to a pipeline stage |
| `discoveryQuestions` | Extra questions shown on the company form (`id`, `section`, `prompt`, `input`) |

Change them with `PATCH /api/settings` (founder/admin JWT) or seed via [`sql/examples/convobrains-settings.sql`](../sql/examples/convobrains-settings.sql).

```bash
curl -s -X PATCH http://localhost:4000/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "championStatusToStage": {
      "Connected - Booked a Discovery Call": "Discovery Call Done",
      "Interested": "Follow-up"
    },
    "discoveryQuestions": [
      {
        "id": "budget",
        "section": "Discovery",
        "prompt": "Rough annual budget?",
        "input": "text"
      }
    ]
  }'
```

`GET /api/config` returns the current map and questions (no auth) so the SPA can use them.

## Auth

| Method | Path                  | Description                                              |
| ------ | --------------------- | -------------------------------------------------------- |
| `POST` | `/api/auth/login`     | `{ email, password }` → `{ token, user }` (rate limited) |
| `POST` | `/api/auth/logout`    | End session `{ reason? }`                                |
| `POST` | `/api/auth/heartbeat` | Touch active session                                     |
| `GET`  | `/api/auth/me`        | Current user                                             |

## Users (admin / founder)

| Method | Path               | Description                                   |
| ------ | ------------------ | --------------------------------------------- |
| `GET`  | `/api/users/roles` | Allowed roles                                 |
| `GET`  | `/api/users`       | List users                                    |
| `POST` | `/api/users`       | Create user `{ name, email, password, role }` |

## CRM

| Method   | Path                    | Description                           |
| -------- | ----------------------- | ------------------------------------- |
| `GET`    | `/api/bootstrap`        | Companies + contacts                  |
| `GET`    | `/api/metrics`          | Dashboard counters                    |
| `POST`   | `/api/companies`        | Create company                        |
| `PATCH`  | `/api/companies/:id`    | Update company                        |
| `DELETE` | `/api/companies/:id`    | Delete (admin)                        |
| `POST`   | `/api/contacts`         | Create contact                        |
| `PATCH`  | `/api/contacts/:id`     | Update contact                        |
| `DELETE` | `/api/contacts/:id`     | Delete (admin)                        |
| `POST`   | `/api/import/prospects` | Bulk import `{ rows: ProspectRow[] }` |

## Conversations (recordings)

Requires AWS env vars. See `.env.example`.

| Method   | Path                              | Description                            |
| -------- | --------------------------------- | -------------------------------------- |
| `POST`   | `/api/conversations/presign`      | Start upload                           |
| `POST`   | `/api/conversations/:id/complete` | Finalize upload                        |
| `GET`    | `/api/conversations`              | List (`contactId` / `companyId` query) |
| `GET`    | `/api/conversations/:id/play`     | Presigned play URL                     |
| `DELETE` | `/api/conversations/:id`          | Delete (admin)                         |

## Activity (admin / founder)

| Method  | Path                                 | Description                                        |
| ------- | ------------------------------------ | -------------------------------------------------- |
| `GET`   | `/api/activity/sdrs`                 | SDR roster                                         |
| `GET`   | `/api/activity/targets`              | Daily targets                                      |
| `PATCH` | `/api/activity/targets`              | Update targets                                     |
| `POST`  | `/api/activity/events`               | Client-side activity event                         |
| `GET`   | `/api/activity/overview`             | Manager overview                                   |
| `GET`   | `/api/activity/timeline`             | Event timeline                                     |
| `GET`   | `/api/activity/company/:id/history`  | Company progress (company + linked contact events) |
| `GET`   | `/api/activity/lead/:entityType/:id` | Lead-centric activity                              |

Deep-link (SPA): `/?page=pipeline&companyId=<uuid>` opens Sales Pipeline with that company dialog.

## Errors

JSON body: `{ "error": "message" }` with appropriate HTTP status (`400`, `401`, `403`, `404`, `409`, `429`, `500`).
