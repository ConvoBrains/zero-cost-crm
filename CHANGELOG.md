# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-17

### Added

- Open-source readiness: `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, GitHub issue/PR templates, Dependabot, and CI
- Public `/api/config` for email-domain policy
- Architecture and API documentation under `docs/`
- Helmet security headers and login rate limiting
- Configurable `ALLOWED_EMAIL_DOMAIN`, `CORS_ORIGINS`, and required AWS bucket/region for recordings

### Changed

- Replaced vulnerable `xlsx` dependency with `exceljs` (+ native CSV/TSV parsing)
- JWT secret is required outside explicit test seed mode (no production fallback)
- Sample import / smoke-test data uses synthetic `@*.example` identities
- Repository metadata points at `ConvoBrains/zero-cost-crm`

### Security

- Removed hardcoded production S3 bucket default
- Documented credential rotation for any secrets that ever lived in git history
