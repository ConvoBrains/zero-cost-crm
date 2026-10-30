# Contributing to Zero Cost CRM

Thanks for helping improve Zero Cost CRM. This guide is for first-time and returning contributors.

**Related docs:** [README](README.md) · [Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Security](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

---

## Getting started

**Requirements:** [Node.js 22+](https://nodejs.org/) and [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/ConvoBrains/zero-cost-crm.git
cd zero-cost-crm
make setup && make dev
```

Open **http://localhost:5173** and sign in with the demo seed account printed by `make setup` (also in the [README](README.md)).

Useful commands:

```bash
make help                 # list all make targets
make setup && make dev    # install deps, start Postgres + demo data, run app
npm run lint              # oxlint
npm run format            # Prettier write
npm run format:check      # Prettier check (also in local npm run ci)
npm test                  # unit tests
npm run ci                # lint + format:check + unit + build
```

**Format:** Prettier is the project formatter (see `.prettierrc`). Run `npm run format` before pushing. GitHub Actions runs `format:check` as part of the CI workflow. Ensure `npm run format:check` passes before submitting your pull request.

---

## Find something to work on

1. Prefer **[unassigned good first issues](https://github.com/ConvoBrains/zero-cost-crm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee)** so you're not blocked on someone else's claim.
2. Want a showcase PR? Browse the **[`fun` label](https://github.com/ConvoBrains/zero-cost-crm/issues?q=is%3Aissue+is%3Aopen+label%3Afun)** (command palette, empty states, docs GIF, etc.).
3. Or pick any [help wanted](https://github.com/ConvoBrains/zero-cost-crm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) ticket.
4. **Comment on the issue** to claim it (e.g. "I'd like to take this"). We'll assign you — usually within a day.
5. Prefer one focused issue at a time.

If you're new to open source, start with labels **`first-timers-only`**, **`good first issue`**, or **`easy`**. Questions welcome in [Discussions](https://github.com/ConvoBrains/zero-cost-crm/discussions).

---

## Branch naming

Create a branch from an up-to-date `main`:

| Prefix   | Use for                |
| -------- | ---------------------- |
| `feat/`  | New feature            |
| `fix/`   | Bug fix                |
| `docs/`  | Documentation only     |
| `test/`  | Tests only             |
| `chore/` | Tooling, deps, cleanup |

Examples: `docs/expand-contributing`, `fix/pipeline-filter-crash`, `feat/export-audit-log`.

```bash
git checkout main
git pull origin main   # or upstream main if you forked
git checkout -b docs/your-short-description
```

---

## Code style

- **Language:** TypeScript + React (Vite frontend, Express API).
- **Lint:** run `npm run lint` (oxlint) before you push.
- **Format:** run `npm run format` / `npm run format:check` (Prettier).
- Prefer small, focused changes. Avoid drive-by refactors unrelated to the issue.
- **No secrets or real PII** in code, commits, or screenshots.
- Schema changes belong in `sql/schema.sql` (see [ARCHITECTURE](docs/ARCHITECTURE.md)).
- Security-sensitive reports → [SECURITY.md](SECURITY.md), not a public issue.

---

## Testing

| What you changed            | What to run                                             | Where tests live                         |
| --------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| Shared helpers / pure logic | `npm test`                                              | `testing/unit/` (`src/lib` → unit tests) |
| API or DB behavior          | `npm run test:api:prep && npm run test:api` (Docker DB) | `testing/functional/api/`                |
| UI flows                    | `make test-e2e` (Docker + Playwright)                   | `testing/e2e/`                           |
| Docs only                   | Note "docs-only" in the PR                              | —                                        |

Always run at least:

```bash
npm ci && npm test          # unit (always for code changes)
npm run lint
npm run format:check
```

When behavior changes, **add or update tests**. GitHub CI also runs API + e2e; local `npm run ci` is lint + format:check + unit + build.

```bash
npm run test:api:prep && npm run test:api   # API tests (needs Docker DB)
make test-e2e                                # UI e2e
```

---

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add CSV export for activity audit log
fix: correct low-stock threshold in inventory API
docs: expand CONTRIBUTING
```
