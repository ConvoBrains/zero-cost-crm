# Feature testing (SDR Activity)

All Activity feature testing runs **only** through this folder.  
Do **not** use root `scripts/`, root `.env`, or production RDS.

## Quick start

```bash
# from repo root
cp testing/.env.testing.example testing/.env.testing   # once
make test-reset    # docker up → migrate → seed users/crm → seed activity
make test-run      # npm run dev with testing/.env.testing
```

Login (Activity page is admin/founder only):

| User | Email | Password | Role |
|------|-------|----------|------|
| Founder | `founder.seed@convobrains.com` | `TestSeed123!` | founder |
| Rahul | `rahul.seed@convobrains.com` | `TestSeed123!` | sdr |
| Neha | `neha.seed@convobrains.com` | `TestSeed123!` | sdr |
| Aman | `aman.seed@convobrains.com` | `TestSeed123!` | sdr |

Open **Activity** in the sidebar (as founder) → filter by agent / date.

## Make targets (root)

| Target | What it does |
|--------|----------------|
| `make test-up` | Start Docker Postgres (`brains_crm_test` on port **5434**) |
| `make test-down` | Stop test DB |
| `make test-migrate` | Apply `sql/schema.sql` to test DB |
| `make test-seed` | Seed users + CRM fixtures |
| `make test-seed-activity` | Regenerate session/call activity (safe to re-run daily) |
| `make test-reset` | Wipe volume + full seed pipeline |
| `make test-run` | Run app pointed at test DB |

## Safety

Scripts load **`testing/.env.testing` only** and abort unless:

1. `ALLOW_ACTIVITY_SEED=1`
2. Host is `localhost` / `127.0.0.1` / `crm-test-db`
3. Database name contains `_test`

## Regenerating data

```bash
make test-seed-activity
```

Replaces prior seed-tagged activity for Rahul / Neha / Aman (today + 2 prior IST days).
