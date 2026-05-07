# Auth BFF and Tenant Isolation Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

The Auth BFF foundation exists and has useful tests, but tenant isolation is not complete across all merchant/admin surfaces. Production-mode hardening covers the developer integration lifecycle and order creation path better than the older merchant/review/Android endpoints.

## Confirmed strengths

- `apps/api/src/auth-bff.ts` defines users, memberships, roles, permissions, admin roles, opaque sessions, HttpOnly cookie serialization and CSRF hashing.
- `apps/api/src/server.ts:354-383` has a centralized `resolveMerchantContext` and `resolveSdkMerchantId`.
- `/auth/dev/bootstrap-session` is disabled in production (`apps/api/src/server.ts:414`).
- `/v1/orders` can resolve stored API-key identity (`apps/api/src/server.ts:686`).
- Developer integration lifecycle routes use BFF context and CSRF when session-backed (`apps/api/src/server.ts:542-667`).
- Receiver registration/heartbeat now use BFF context and CSRF (`apps/api/src/server.ts:1323`, `:1379`).

## Blocking / high-risk gaps

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| Critical | `apps/api/src/server.ts:386-414` | Google OAuth start/callback are fail-closed seams returning 501/503. | Real OAuth flow cannot be tested yet. |
| High | `apps/api/src/server.ts:752`, `:794`, `:841`, `:895`, `:914`, `:1625`, `:1785`, `:1843` | Order read, session read, receiving routes, reviews and review actions still use `parseMerchantId`. | Production tenant isolation is incomplete unless these are kept API-key/dev-only and explicitly gated. |
| High | `apps/web/src/index.ts:357-371`, `:480-514`, `:747-819` | Web app uses server-side bearer seam, not browser BFF session cookie/CSRF forwarding. | Merchant web POST forms do not yet exercise the real BFF session boundary. |
| High | `apps/web/src/index.ts:525-580` | Admin web surfaces use a configured admin token client and have no browser identity/session route boundary. | Admin UI is not ready for real operator login. |

## Tenant isolation concern

The API repository calls usually scope reads by `merchantId`, which is good. The remaining issue is how `merchantId` is resolved. Several routes still accept development bearer-derived merchant IDs and are not yet migrated to `requireMerchantPermission`.

## Recommendation

Before real-world testing:

1. Finish BFF migration for all merchant dashboard/review/receiving-method routes.
2. Make web server pass/validate BFF cookies and CSRF tokens instead of using process-level bearer for merchant mutations.
3. Implement real Google OAuth exchange or keep OAuth tests out of real-world scope.
4. Add route-by-route production tests for every merchant/admin endpoint, not just developer integration and orders.

