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

**Format:** Prettier is the project formatter (see `.prettierrc`). Run `npm run format` before you push. Local `npm run ci` includes `format:check`. GitHub Actions does not yet run `format:check` in the unit job (workflow update pending); until then, treat format check as required for local and PR readiness.

---

## Find something to work on

1. Browse [good first issues](https://github.com/ConvoBrains/zero-cost-crm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [help wanted](https://github.com/ConvoBrains/zero-cost-crm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).
2. **Comment on the issue** to claim it (e.g. “I’d like to work on this”).
3. Prefer one focused issue at a time.

If you’re new to open source, start with labels **`first-timers-only`**, **`good first issue`**, or **`easy`**.

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
| Docs only                   | Note “docs-only” in the PR                              | —                                        |

Always run at least:

```bash
npm ci && npm test          # unit (always for code changes)
npm run lint
npm run format:check
```

When behavior changes, **add or update tests**. GitHub CI also runs API + e2e; local `npm run ci` is lint + format:check + unit + build.

```bash
npm run test:api:prep && npm run test:api   # API tests (needs Docker DB)
make test-e2e                               # UI e2e
```

---

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add CSV export for activity audit log
fix: correct low-stock threshold in inventory API
docs: expand CONTRIBUTING for first-time contributors
test: cover settings PATCH validation
chore: add Prettier config
```

Keep the subject short; put detail in the body if needed.

---

## Pull requests

1. Push your branch and open a PR against **`ConvoBrains/zero-cost-crm` `main`**.
2. Fill out [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
3. Link the issue: `Closes #123` or `Fixes #123`.

### PR checklist

- [ ] PR description explains **what** and **why**
- [ ] Linked issue
- [ ] `npm test` (and `npm run test:api` / `make test-e2e` if API/UI flows changed)
- [ ] New/updated tests for behavior changes (or marked docs-only)
- [ ] `npm run lint` clean
- [ ] `npm run format:check` clean
- [ ] No secrets / PII
- [ ] CI green

Keep PRs focused. One issue → one PR when possible.

---

## Issue labels (glossary)

| Label                      | Meaning                                          |
| -------------------------- | ------------------------------------------------ |
| `good first issue`         | Good for newcomers                               |
| `first-timers-only`        | Reserved for first-time open source contributors |
| `help wanted`              | Maintainers want community help                  |
| `easy` / `medium` / `hard` | Scope / difficulty                               |
| `documentation`            | Docs-only or docs-primary work                   |
| `frontend`                 | UI / React / Tailwind                            |
| `backend`                  | API / Express / DB                               |
| `testing`                  | Tests and CI quality                             |
| `bug` / `enhancement`      | Broken behavior vs new capability                |
| `a11y`                     | Accessibility                                    |
| `security`                 | Security hardening (see also SECURITY.md)        |

Issue templates live in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

---

## Questions

- Product / setup questions: open a [question](https://github.com/ConvoBrains/zero-cost-crm/issues/new?template=question.md) issue.
- Unsure how to approach a task: comment on the issue before large changes.

Welcome aboard — even small docs and test PRs help.
