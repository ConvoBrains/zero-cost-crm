# Local testing against live Convobrains RDS

Use this before pushing Zero Cost CRM and before cutting over `crm.convobrains.com`.

## Goal

- Run **stock Zero Cost CRM** on `localhost:5173`
- Talk to the **same live Postgres** (`brains_crm_int`) your production CRM uses
- Keep **all existing users / companies / contacts**
- Apply Convobrains branding + SDR contact statuses via DB settings (not a code fork)

## Why an SSH tunnel?

This laptop cannot open TCP `5432` to RDS directly (security group). Local IntCRM already expects:

```text
localhost:5433  →  SSH jump host  →  RDS brains_crm_int
```

## 1. Open the tunnel

Use the same SSH command you already use for ConvobrainsIntCRM, forwarding local `5433` to RDS `5432`. Example shape (fill in your EC2 user/host):

```bash
ssh -N -L 5433:<rds-host>:5432 <ec2-user>@<ec2-host>
```

Leave that terminal open. Check:

```bash
nc -z -w 2 127.0.0.1 5433 && echo tunnel_ok
```

## 2. Env file (already prepared)

[`../.env.local`](../.env.local) is gitignored and was generated from ConvobrainsIntCRM secrets:

- Tunnel `DATABASE_URL` / `DB_URL_DEV` (`localhost:5433`)
- `DB_SSL=true` (required — RDS rejects non-SSL even through the tunnel)
- Same `JWT_SECRET` (so existing sessions/passwords keep working)
- `ALLOWED_EMAIL_DOMAIN=convobrains.com`
- Existing AWS S3 recording credentials

Do **not** commit `.env.local`.

## 3. Migrate schema + Convobrains settings

From `zero-cost-crm/`:

```bash
chmod +x scripts/local-against-live.sh
./scripts/local-against-live.sh
```

This runs (crm-role safe — full `schema.sql` may fail on postgres-owned indexes):

1. `sql/examples/live-rds-cutover.sql` — drop contact status CHECK, create `app_settings`, add `discovery_questions` / `discovery_answers`
2. `sql/examples/convobrains-settings.sql` — brand + full IntCRM contact statuses + discovery questionnaire
3. Prints counts: users / companies / contacts / brand / status count

**Note:** `companies_stage_check` stays (postgres-owned). Default stages already match, so pipeline is fine.

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:5173 and sign in with an existing `@convobrains.com` account.

Smoke checklist:

- [ ] Login works for an existing user
- [ ] Pipeline shows existing companies
- [ ] Contacts show IntCRM statuses (WhatsApp / DQ / etc.)
- [ ] Contact views: Send Email, Send WhatsApp, Discovery Booked, Not ICP / DQ
- [ ] Settings page shows Convobrains brand (founder/admin)
- [ ] Call recording upload/play if you use S3

## 5. After localhost looks good

1. Push Zero Cost CRM changes to `ConvoBrains/zero-cost-crm`
2. Sync private deploy copy (`ConvobrainsIntCRM`) from upstream
3. Deploy to EC2 → `crm.convobrains.com` (same RDS; no user migration)

## Safety notes

- Never run demo/test seed scripts against live RDS
- Schema migrate drops rigid stage/status CHECKs and adds `app_settings` only
- Users table is untouched
- If migrate fails mid-way, fix and re-run (idempotent)
