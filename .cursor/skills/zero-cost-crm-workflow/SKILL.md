---
name: zero-cost-crm-workflow
description: >-
  Mandatory delivery workflow for ConvoBrains/zero-cost-crm and its private
  Convobrains deploy mirror. Use whenever implementing features, fixing bugs,
  opening PRs, merging to public main, or deploying for zero-cost-crm,
  ConvobrainsIntCRM, crm.convobrains.com, or Sales Pipeline / Contacts work
  on this product. Also use before any push/merge to audit that no Convobrains
  config, secrets, or host overlays are entering the public OSS repo.
---

# Zero Cost CRM delivery workflow

Follow this order **every time** for `/Users/CodeBase/zero-cost-crm` (public OSS). Do not skip steps. Do not push to OSS before Convobrains local verification.

## Hard sequence

1. **Code** — implement the feature/fix on a feature branch off `main`.
2. **Tests** — add or update unit, functional, and e2e coverage for the new behavior; fix any broken prior tests. All of these must pass locally:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
   - `npm run test:api` (after `make test-up` + `npm run test:api:prep` when needed)
   - `npm run test:e2e`
3. **Convobrains local verify** — before any push to `zero-cost-crm`, run against live Convobrains config (SSH tunnel + `.env.local`, see `docs/LOCAL_LIVE.md`): `npm run dev`, smoke the changed UI with real data. Do **not** seed/demo against live RDS.
4. **OSS purity audit** — before push and again before the user merges the PR into public `zero-cost-crm` `main`, confirm **no Convobrains-specific config** is in the branch. See section below. Block push/merge if anything fails.
5. **PR + push** — push the feature branch and open a PR against public `ConvoBrains/zero-cost-crm`. Link issues (`Closes #N`).
6. **Stop** — wait for the user to **manually merge** the PR. Re-run the OSS purity audit on the final PR diff if anything was added in review.
7. **Only after merge** — sync product files into the private deploy repo (`ConvobrainsIntCRM` / `crm.convobrains.com`), push private `main` to trigger Deploy to EC2, verify `https://crm.convobrains.com/api/health`.

## OSS purity audit (before push and before merge)

Public `zero-cost-crm` must stay instance-agnostic. Run this audit on the PR branch vs `main`:

```bash
git fetch origin main
git diff --name-only origin/main...HEAD
git status --ignored -sb
```

**Must not appear in the PR diff (block if present):**

| Pattern / path | Why |
| --- | --- |
| `.env`, `.env.local`, `.env.*` (except committed `.env.example` / test fixtures) | Secrets / live DB |
| `ALLOWED_EMAIL_DOMAIN=convobrains.com` or hard-coded `@convobrains.com` allow-lists | Tenant policy |
| Live RDS hosts, JWT/AWS keys, S3 bucket names, production URLs | Host secrets |
| `sql/examples/convobrains-settings.sql`, live dumps, customer exports | Tenant data |
| `docs/LOCAL_LIVE.md` with real host/tunnel credentials (if present, keep gitignored) | Ops secrets |
| Deploy / nginx / EC2 / GitHub Action overlays from private repo | Private deploy only |
| Hard-coded brand strings as the only product name (e.g. forcing "Convobrains CRM") | Belongs in DB `app_settings` |

**Safe to ship:** product UI/API that any Zero Cost CRM instance could use; generic `.env.example`; seed data that is clearly fake/demo.

Also run a content scan on changed files:

```bash
git diff origin/main...HEAD | rg -i 'convobrains|rds\.amazonaws|AKIA|BEGIN (RSA |OPENSSH )?PRIVATE|jwt_secret|allowed_email_domain\s*=\s*convobrains' || true
```

If matches are real config/secrets (not harmless issue text like `Closes #N` docs), remove them before push/merge. Tell the user what was found.

## OSS vs Convobrains boundary

| Concern | Where |
| --- | --- |
| Product features any instance could use | Public `zero-cost-crm` |
| Brand / stages / contact statuses | Live DB `app_settings` (not a code fork) |
| Secrets, domain, S3, RDS | EC2 host `.env` or gitignored `.env.local` |
| Deploy / nginx / GitHub Action | Private deploy repo only |

Pushing OSS does **not** deploy production. Deploy = post-merge private sync only.

## Private sync note

Public and private git histories are unrelated. After merge, checkout changed product paths from `upstream/main` into the private repo (do not `merge --allow-unrelated-histories`). Keep deploy overlay files untouched.

## Checklist (copy per task)

```
- [ ] Code complete on feature branch
- [ ] Unit / functional / e2e added or fixed; all green
- [ ] Convobrains localhost smoke passed
- [ ] OSS purity audit passed (no Convobrains config/secrets in PR)
- [ ] PR opened; waiting on manual merge
- [ ] Re-audit final PR diff before merge if review commits landed
- [ ] (After merge) private sync + EC2 deploy + health OK
```
