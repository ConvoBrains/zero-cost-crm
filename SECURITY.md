# Security Policy

## Supported versions

| Version            | Supported   |
| ------------------ | ----------- |
| `main` (latest)    | Yes         |
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

## Authentication security

Authentication uses a 12-hour JWT stored in an `HttpOnly` cookie.

The authentication cookie uses:

* `HttpOnly` to prevent frontend JavaScript from reading the JWT
* `Secure` in production so the cookie is only sent over HTTPS
* `SameSite=Lax` to reduce cross-site request exposure

The login API returns user information only and does not return the JWT in the response body.

## CSRF protection

Cookie-authenticated state-changing requests are protected using a double-submit CSRF token.

On login, the server sets:

* `token` — HttpOnly authentication cookie
* `csrfToken` — frontend-readable CSRF cookie

For mutating requests, the frontend sends the CSRF value in the `X-CSRF-Token` header. The server verifies that the cookie and header values match.

## CORS and deployment

Cookie authentication requires credentialed CORS.

Production deployments must configure `CORS_ORIGINS` with only trusted frontend origins.

Frontend API requests use:

```text
credentials: include
```

Production deployments should use HTTPS so `Secure` cookies are enforced.

## Residual risks

HttpOnly cookies reduce the risk of JWT theft through JavaScript, but they do not prevent XSS.

The CSRF token is intentionally readable by frontend JavaScript, so CSRF protection should not be considered protection against XSS.

