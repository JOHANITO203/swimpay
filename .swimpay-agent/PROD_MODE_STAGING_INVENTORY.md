# Sprint 9K - Production-mode Staging Inventory

Date: 2026-05-07

## Scope

Audit production-mode staging readiness after Sprint 9J Auth BFF foundation.

No public production deployment was performed. No real bank notifications were captured or processed.

## Environment Controls

| Area | Current state | Readiness |
| --- | --- | --- |
| `NODE_ENV` / API environment | `buildApiServer({ environment })` controls dev bearer fallback, cookies and auth mode | Partially ready |
| Local `Bearer test_*` merchant auth | Rejected in production mode for SDK orders and Receiver register/heartbeat | Ready for covered routes |
| Dev BFF bootstrap | `/auth/dev/bootstrap-session` returns 404 in production mode | Ready |
| Google OAuth | Provider seam exists and fails closed when env is missing; token exchange is still follow-up | Partial |
| BFF session cookie | Opaque, HttpOnly, Secure in production, SameSite=Lax | Ready |
| CSRF | Session-bound CSRF for BFF-backed mutations; expanded to Receiver register/heartbeat | Ready for covered routes |
| Stored API key verification | `/v1/orders` resolves merchant from hashed stored keys | Ready for order creation |
| Receiver identity | Registration stores public key and heartbeat uses merchant context; signal upload uses receiver device key/signature | Partial |
| Webhook signing/config | Developer lifecycle stores masked/encrypted webhook secret and safe delivery history | Partial |
| DB migrations | Additive migrations through `010_auth_bff_foundation.sql` | Ready with runbook |
| Docker Compose production assumptions | Local Compose is still development-oriented; production-mode staging needs separate env/secret injection | Partial |

## Route Inventory

| Route | Intended identity | Production-mode behavior |
| --- | --- | --- |
| `GET /auth/google/start` | Google OAuth human login | Fails closed if OAuth env missing; exchange not enabled yet |
| `GET /auth/google/callback` | Google OAuth callback | Provider seam present; exchange follow-up |
| `POST /auth/dev/bootstrap-session` | Dev-only BFF bootstrap | Disabled in production |
| `GET /v1/me` | BFF session | Requires valid session |
| `POST /auth/logout` | BFF session + CSRF | Requires CSRF when session exists |
| `/v1/merchant/integration*` | BFF session or dev bearer outside production | BFF active merchant context preferred; CSRF for mutations |
| `POST /v1/orders` | Merchant API key | Stored hashed API key accepted; `test_*` rejected in production |
| `POST /v1/receiver-devices/register` | BFF merchant session + CSRF, dev bearer outside production | Hardened for production session/CSRF |
| `POST /v1/receiver-devices/heartbeat` | BFF merchant session + CSRF, dev bearer outside production | Hardened for production session/CSRF |
| `POST /v1/receiver/signals` | Receiver signed payload | Signed/redacted synthetic payload path exists |

## Missing / Partial

- Real Google OAuth token exchange is still a fail-closed seam.
- Production-mode live Compose was not configured with a committed production env because real secrets must not be used without explicit approval.
- Full VPS staging migration/runbook is documented, but not executed on a real VPS in this sprint.
- Some legacy merchant read routes still use older dev bearer foundations and should be moved to BFF permissions in a later hardening pass.

