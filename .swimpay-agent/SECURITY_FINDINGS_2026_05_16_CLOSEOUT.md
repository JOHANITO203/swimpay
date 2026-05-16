# Security Findings Closeout — 2026-05-16

## Source

- Input: `codex-security-findings-2026-05-16T00-51-07.147Z.csv`
- Scope: security hardening only; no payment state-machine, webhook semantics, receiver runtime, or database migration changes.

## Root Causes

1. Privileged web helper surfaces were reachable without a real merchant web session boundary.
2. Android developer export mixed user-facing setup text with raw bearer/API/webhook secrets.
3. Webhook URL validation accepted HTTPS syntax before blocking private/local destinations, and worker delivery did not re-check resolved egress IPs.
4. Google recovery audience selection was environment-agnostic and role recovery did not require owner/admin membership.
5. Receiving method normalization allowed long card-like values that could include CVV material.
6. Bank-evidence deprecation could bypass the pending-review gate.
7. Compose/Caddy defaulted to HTTP-only proxy wiring.

## Fixes Applied

- Disabled privileged web/admin surfaces outside `test` and explicitly enabled development mode.
- Removed raw Android mobile bearer, API secret, and webhook secret from clipboard export lines.
- Centralized public webhook URL validation in `packages/security` and added DNS egress validation before worker fetch.
- Restricted production Google ID-token audiences to the production Android server client ID.
- Restricted Android Google recovery to active owner/admin merchant memberships.
- Removed Android mobile integration mutation permissions; mobile sessions retain read and review actions.
  - 2026-05-17 addendum: this was too broad for the already-existing Android Merchant integration contract and caused `Créer clé API` to fail with `Integration indisponible`. Scoped Android mobile integration permissions were restored in `.swimpay-agent/ANDROID_INTEGRATION_API_KEY_MOBILE_FIX_REPORT.md` while preserving web CSRF, show-once secrets and no mobile bearer export.
- Rejected card receiving values longer than 16 digits in API and order route normalization.
- Required pending operator review for every bank-evidence action, including `deprecate`.
- Made Caddy site address configurable and exposed HTTPS port for production TLS wiring.
- Added `android:assemble:debug-vps` guardrails so debug VPS builds use HTTPS staging and a Google server client ID.

## Tests And Validation

- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npx vitest run tests/deployment-compose.test.ts`
- `npm test`
- `docker compose -f infra/docker-compose.yml config --quiet` with CI-equivalent `ADMIN_TOKEN_HMAC_SECRET`
- `npm run android:test`
- `npm run android:assemble:debug-vps`

## CI Log Result

The supplied GitHub log failure was `tests/deployment-compose.test.ts`, caused by a stale private-network assertion. Current local test state is aligned to `swimpay_runtime` and passes.

## Remaining Deployment Notes

- Production must set `ADMIN_TOKEN_HMAC_SECRET` from external secret storage.
- Production HTTPS should set `SWIMPAY_CADDY_SITE_ADDRESS` to the public domain so Caddy can manage TLS.
- The web developer wizard remains intentionally disabled outside trusted dev/test surfaces until a real authenticated merchant web session boundary is implemented.
