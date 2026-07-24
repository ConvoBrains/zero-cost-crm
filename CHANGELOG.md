# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Instance `app_settings` table for branding, pipeline stages, and contact statuses (DB-backed; keeps the product generic across deploys)
- `GET /api/config` now returns `brandName`, `brandTagline`, `logoUrl`, `stages`, `contactStatuses`, `championStatusToStage`
- `PATCH /api/settings` (admin/founder) to update instance settings
- Settings page in the UI for founders/admins
- Optional env bootstrap: `BRAND_NAME`, `BRAND_TAGLINE`, `BRAND_LOGO_URL`

### Changed

- Company `stage` and contact `contact_status` SQL CHECK constraints removed; validation uses instance settings
- Default `ALLOWED_EMAIL_DOMAIN` is `*` (set your org domain in env for locked installs)
- Auth localStorage keys renamed to `zcrm-*` (legacy `convobrains-crm-*` keys still read)

## [1.1.0] — 2026-07-17

### Changed

- Renamed the product from “SDR War Room” to **Zero Cost CRM** across UI, docs, package metadata, and schema comments
- Package name is now `zero-cost-crm`

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
