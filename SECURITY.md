# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (latest) | Yes |
| Older tags / forks | Best effort |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email **support@convobrains.com** with:

- A description of the issue and impact
- Steps to reproduce or a proof of concept
- Affected commit / version if known

We aim to acknowledge reports within **72 hours** and to provide a remediation
plan or fix timeline after triage.

## Safe disclosure

- Do not access data that is not yours
- Do not degrade availability of production systems
- Give us a reasonable window to patch before public disclosure

## Hardening tips for operators

- Set a unique `JWT_SECRET` (never reuse demo/testing values)
- Restrict `CORS_ORIGINS` in production
- Keep Postgres TLS enabled (`DB_SSL=true`) for remote databases
- Keep S3 buckets private; use presigned URLs only
- Rotate any credential that may have appeared in git history or logs
