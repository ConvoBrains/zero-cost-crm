# Contributing

```bash
make setup && make dev
npm ci && npm test          # unit (always)
npm run test:api:prep && npm run test:api   # API tests (needs Docker DB)
make test-e2e               # UI e2e (Docker up + Playwright)
# GitHub CI also runs API + e2e — local `npm run ci` is lint+unit+build only
```

**Tests:** change behavior → add tests.  
`src/lib` → `testing/unit/` · API/DB → `testing/functional/api/` · UI flows → `testing/e2e/` · docs-only → note in PR.

Pick a [good first issue](https://github.com/ConvoBrains/zero-cost-crm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22), comment to claim, open a focused PR.  
No secrets or real PII. Schema changes → `sql/schema.sql`. Security → [SECURITY.md](SECURITY.md).
