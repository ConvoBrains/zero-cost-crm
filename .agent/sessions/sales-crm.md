# Task: Convobrains Sales CRM

## Objective
Sales CRM with RDS-backed auth/data, daily paste-import, kanban pipeline, contacts, dashboard. Deploy on Vercel.

## Current State
- Express API (`server/app.ts`) — auth, companies, contacts, import, metrics
- Vercel serverless entry: `api/index.ts` re-exports Express app
- `vercel.json`: static `dist/` + `/api/*` rewrite + SPA fallback
- React frontend calls `/api/*` (Vite proxy in dev, same-origin on Vercel)
- PostgreSQL `brains_crm_int` on RDS ap-south-1
- 5 team users; monojoy = sdr, others admin
- Mobile-responsive UI

## Decisions Made
- Node `pg` + Express in TS monorepo
- JWT sessions (7d) in localStorage
- SSL for pg by default; pool max 2 on Vercel
- Env: `DATABASE_URL` or `DB_URL_DEV` (asyncpg URL format supported)
- Never commit prod credentials

## Constraints
- Local: SSH tunnel + `.env.local`
- Vercel: set `DB_URL_DEV` + `JWT_SECRET` in project env
- RDS security group must allow Vercel egress to port 5432

## Progress
- API + frontend wired to RDS
- Roles, import, E2E verified locally
- Vercel deployment config added (api/, vercel.json, dbUrl helpers)

## Next Steps
- Push to GitHub and deploy on Vercel with prod env vars
- Run `db:migrate`, `db:seed`, `db:roles` against prod RDS once
- Confirm `/api/health` and login on production URL
- Rotate RDS password if exposed in chat/logs

## Notes
Prod RDS host: `main.c1k808wwgo0a.ap-south-1.rds.amazonaws.com` / `brains_crm_int`
User sets URL in Vercel dashboard only — not in repo.
