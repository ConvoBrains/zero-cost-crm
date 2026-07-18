# Architecture

## Overview

```text
┌─────────────┐     /api/* proxy      ┌──────────────┐
│  Vite/React │ ───────────────────► │  Express API │
│  (port 5173)│                      │  (port 4000) │
└─────────────┘                      └──────┬───────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │  PostgreSQL  │
                                     └──────────────┘
                                            │
                         optional recordings ▼
                                     ┌──────────────┐
                                     │     S3       │
                                     └──────────────┘
```

In production (`NODE_ENV=production`), Express also serves the built SPA from `dist/`.

## Major modules

| Path | Role |
| ---- | ---- |
| `src/` | React UI (dashboard, pipeline, contacts, import, activity, users) |
| `server/app.ts` | HTTP routes, auth, CRM CRUD, import |
| `server/activity*.ts` | SDR sessions, events, manager overview |
| `server/conversations.ts` | Recording upload/presign/play |
| `server/config.ts` | Environment validation |
| `sql/schema.sql` | Idempotent Postgres schema |
| `testing/unit/` | Unit tests |
| `testing/functional/` | Test DB + API tests |
| `testing/e2e/` | UI e2e (Playwright) |

## Data model (ER sketch)

```text
users 1──* companies (assigned_to)
users 1──* user_sessions
users 1──* activity_events
companies 1──* contacts
companies 1──* conversations
contacts 1──* conversations
sdr_daily_targets (singleton-ish row)
```

Source of truth: [`sql/schema.sql`](../sql/schema.sql).

## Auth & roles

- Password hashes: bcrypt
- Sessions: JWT (12h) + server-side `user_sessions` for idle tracking
- Roles: `founder`, `admin`, `sdr`
- Email domains: `ALLOWED_EMAIL_DOMAIN` (`*` = any)

## Demo vs production DBs

- `make setup` / `make test-*` use `testing/functional/docker-compose.yml` only
- Seed scripts abort unless the DB name contains `_test` and the host is local
- Never point seed scripts at production

## Schema strategy

There is a single idempotent SQL file rather than numbered migrations. Apply with:

```bash
npm run db:migrate
```

For breaking changes, document upgrade steps in the PR and CHANGELOG.
