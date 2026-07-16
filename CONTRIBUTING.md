# Contributing

Thanks for helping improve Zero Cost CRM.

## Development setup

Requirements: Node.js 22+, Docker.

```bash
git clone https://github.com/ConvoBrains/zero-cost-crm.git
cd zero-cost-crm
make setup
make dev
```

Open http://localhost:5173 with the demo founder account from the README.

## Checks before a PR

```bash
npm ci
npm run ci   # lint + smoke + build
```

## Branching & commits

- Branch from `main`: `feature/…`, `fix/…`, or `docs/…`
- Prefer focused PRs with a clear description and test notes
- Do not commit `.env`, credentials, customer data, or real phone numbers/emails

## Coding guidelines

- TypeScript strict; keep API handlers thin where practical
- Validate request inputs; fail closed on missing secrets in production
- Schema changes go in [`sql/schema.sql`](sql/schema.sql) (idempotent) and are documented in the PR
- Demo/seed data must use synthetic `@*.example` identities

## Pull requests

Use the PR template. Include:

1. What changed and why
2. How you tested (`make setup`, `npm run ci`, manual paths)
3. Screenshots for UI changes when useful

## Reporting security issues

Do **not** open a public issue for vulnerabilities. See [SECURITY.md](SECURITY.md).

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
