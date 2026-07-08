# Task: Convobrains Sales CRM — Docker deploy

## Objective
Self-host CRM on port 4000 with Docker, nginx at crm.convobrains.com, RDS Postgres.

## Current State
- Express API + React/Vite frontend monorepo
- `.env` created with RDS `brains_crm` URL, PORT=4000, JWT_SECRET
- Production: Express serves `dist/` static + `/api/*` when NODE_ENV=production
- Dockerfile (multi-stage), docker-compose.yml, Makefile, nginx config in `deploy/nginx/`

## Decisions Made
- Port 4000 (default in server, vite proxy, Docker)
- DB: `postgresql://...@main.c1k808wwgo0a.ap-south-1.rds.amazonaws.com/brains_crm`
- Nginx on host proxies HTTPS → localhost:4000 (Docker container)
- `.env.example` is template only; real secrets in `.env` (gitignored)

## Constraints
- RDS security group must allow server IP on 5432
- Never commit `.env`
- Certbot for TLS on crm.convobrains.com

## Progress
- Dockerfile + compose + Makefile + nginx config added
- server/app.ts static serving for production
- package.json `start` script added

## Next Steps
- `make docker-build && make docker-up`
- `make db-migrate db-seed db-roles` (from host with .env)
- DNS A record → server, `make deploy-nginx`, certbot
- Verify https://crm.convobrains.com/api/health

## Notes
GitNexus: 435 symbols, 9 processes, LOW risk for app static-serving change.
