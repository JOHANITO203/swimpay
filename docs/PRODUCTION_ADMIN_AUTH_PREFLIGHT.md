# Production Admin Auth Preflight

Sprint 5B defines the production admin authentication preflight for the one-server Docker Compose deployment shape.

This is a readiness and configuration-safety package only. It does not deploy SwimPay, does not create production operator credentials and does not authorize real bank notification processing.

## Required Production Shape

Production admin endpoints must not run with development-token authentication.

Required production admin settings:

- `NODE_ENV=production`
- `ADMIN_AUTH_MODE=signed_token` or a future external identity provider mode
- `ADMIN_TOKEN_HMAC_SECRET` injected from the server environment or secret store when `signed_token` is used
- `DEV_ADMIN_TOKEN` blank
- `DEV_ADMIN_OPERATOR_ID` blank
- `DEV_ADMIN_ROLE` blank

Forbidden production settings:

- `ADMIN_AUTH_MODE=dev_token`
- any configured `DEV_ADMIN_TOKEN`
- any configured `DEV_ADMIN_OPERATOR_ID`
- any configured `DEV_ADMIN_ROLE`
- placeholder or local-only HMAC secrets
- committed operator tokens

## Compose Secret Injection

Use `infra/docker-compose.production-admin-auth.override.yml` as the documented production admin-auth overlay.

The override intentionally requires the operator token HMAC secret through Compose interpolation:

```text
ADMIN_TOKEN_HMAC_SECRET: ${ADMIN_TOKEN_HMAC_SECRET:?set ADMIN_TOKEN_HMAC_SECRET from external secret storage}
```

The committed `.env.production.example` leaves secret values blank. The actual secret must come from the host environment, a deployment secret store or another approved external secret injection mechanism.

## Preflight Command

Run:

```text
npm run production:admin-auth-preflight
```

The preflight is non-mutating and filesystem-only. It checks:

- required production admin-auth artifacts exist;
- blockers are clear;
- the production template does not contain development admin values;
- the Compose override requires external secret injection;
- production examples do not commit admin tokens or HMAC secrets;
- selected safety docs do not introduce unsafe payment wording or auto-confirm behavior.

## Local Rehearsal Boundary

`scripts/operator-token-helper.mjs` remains local rehearsal tooling. It is useful for signed-token dry runs but is not production operator lifecycle tooling.

Production operator lifecycle still requires:

- operator onboarding;
- credential issuance;
- rotation;
- revocation;
- break-glass controls;
- audit review.

## Payment-Safety Boundary

Production admin auth readiness does not change matching, review, evidence or payment decision logic.

Production trust remains app metadata trust only. Auto-confirmation remains gated by the existing deterministic backend rules and is not enabled by admin-auth configuration.
