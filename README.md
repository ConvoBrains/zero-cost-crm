# Convobrains Sales CRM

Sales Pipeline CRM for Convobrains (Founder's Office SDR).

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # set DB_URL_DEV + JWT_SECRET
npm run dev                  # Vite + API on :5173 / :3001
```

## Login

`@convobrains.com` only. Team passwords are set via `npm run db:seed`.

## Daily lead import

1. Log in → **Import Leads**
2. Paste table from Excel / Sheets / LinkedIn (tab or comma separated)
3. Columns: `Company | Prospect Name | Job Title | Email | Phone | Location | Employees | Industry`
4. Import → companies created/updated, contacts added (duplicate emails skipped)

## Database

Postgres `brains_crm` on RDS. URL env: `DB_URL_DEV` or `DATABASE_URL` (asyncpg-style OK).

**Local:** SSH tunnel → `postgresql+asyncpg://postgres:PASSWORD@localhost:5433/brains_crm`

```bash
npm run db:migrate
npm run db:seed
npm run db:roles    # monojoy → sdr, others → admin
```

## Deploy on Vercel

1. Import this repo in [Vercel](https://vercel.com).
2. **Environment variables** (Production):

    | Name         | Value                                                                |
    | ------------ | -------------------------------------------------------------------- |
    | `DB_URL_DEV` | `postgresql+asyncpg://postgres:…@main….rds.amazonaws.com/brains_crm` |
    | `JWT_SECRET` | Long random string (not `change-me-in-production`)                   |

    `DATABASE_URL` works too if you prefer that name.

3. Deploy. `vercel.json` serves the Vite build from `dist/` and routes `/api/*` to the Express serverless function.

4. **RDS access:** Vercel runs on dynamic IPs. Your RDS security group must allow inbound PostgreSQL (5432) from Vercel (often `0.0.0.0/0` on a publicly accessible RDS instance, or Vercel Static IPs on Pro).

5. After first deploy, run migrations against prod (from a machine that can reach RDS):

    ```bash
    DB_URL_DEV='postgresql+asyncpg://…' npm run db:migrate
    DB_URL_DEV='postgresql+asyncpg://…' npm run db:seed
    DB_URL_DEV='postgresql+asyncpg://…' npm run db:roles
    ```

6. Smoke test: `https://your-app.vercel.app/api/health` → `{"ok":true}`

Never commit production passwords. Set secrets only in Vercel (or `.env.local` locally).

## What's included

- Dashboard metrics
- Kanban Sales Pipeline (13 stages + views)
- Contacts (Champion → Primary Contact)
- Paste import UI
- JWT auth, role-based delete (admin only)

See [`sql/schema.sql`](sql/schema.sql).
