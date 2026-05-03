# Sprint 7C Report - Checkout Destination Copy Hardening, Merchant Route Admin UX and Browser QA

status: passed
generated_at: 2026-05-03T19:06:22+03:00

## Summary

Sprint 7C hardened the hosted-checkout destination copy flow and added a minimal merchant receiving-route admin surface before private beta.

SwimPay remains a Payment Signal Engine. This sprint did not process real bank notifications, did not enable auto-confirmation, did not add SMS/SBP/bank scraping behavior, and did not claim official bank confirmation.

## Tasks

- 374_copy_details_session_hardening - completed
- 375_copy_details_rate_limit_and_audit - completed
- 376_copy_details_short_lived_reveal_policy - completed
- 377_merchant_receiving_route_admin_ui - completed
- 378_hosted_checkout_browser_qa - completed
- 379_checkout_destination_copy_e2e_tests - completed
- 380_sprint_7c_closeout_review - completed

## Copy-details Session Hardening

`GET /v1/checkout/:session_id/receiving-route/copy-details` now requires:

- a configured merchant bearer token;
- an existing checkout/payment session;
- a non-expired and active payment-session status;
- a selected receiver bank and selected receiving route;
- an enabled route owned by the session merchant;
- selected route bank profile matching the selected receiver bank profile.

Inactive/rejected/expired sessions cannot reveal full destination details. Normal checkout HTML/status responses continue to use masked route details.

## Rate Limit and Audit

Copy-details reveal is rate-limited by session id, selected route id and coarse client fingerprint. Excess requests return `429 copy_details_rate_limited` with `Retry-After`.

Successful reveals write redacted audit event `checkout.destination_copied` with session id, route id, rail type and masked identifier only. Audit payloads do not include raw card, raw phone or full receiver identifiers.

## Short-lived Reveal Policy

Copy-details responses include:

- `masked_identifier`
- `destination_value`
- `reveal_expires_at`
- `copy_action=explicit_buyer_copy`
- `does_not_confirm_payment=true`
- `official_bank_confirmation=false`

API and hosted web proxy responses use `Cache-Control: no-store` and `Pragma: no-cache`.

## Merchant Route Admin UI

Added minimal `swimpay-web` route admin surface:

```text
GET /admin/merchant-receiving-routes
POST /admin/merchant-receiving-routes
POST /admin/merchant-receiving-routes/:routeId/disable
POST /admin/merchant-receiving-routes/:routeId/recommend
```

The page lists bank, rail, masked identifier, route code, enabled/recommended state and review policy. It supports create, disable and mark-recommended actions. Full card/phone input is accepted only during create/edit form submission and is not rendered after save.

Card routes display beta review-first warning. Route admin does not enable auto-confirm.

## Hosted Checkout Browser QA

Hosted checkout tests cover:

- mobile responsive CSS;
- bank selection step without route details;
- route reveal after bank selection;
- copy-details proxy headers and response shape;
- payer launcher/manual fallback;
- buyer claimed paid behavior;
- needs-review/expired safe copy;
- no raw destination or personal merchant identity in HTML;
- no official-bank-confirmation or guaranteed-payment wording.

## Tests Added or Updated

- `apps/api/src/payment-sessions.test.ts`
- `apps/web/src/checkout.test.ts`
- `apps/web/src/merchant-routes-admin.test.ts`
- `packages/security/src/index.test.ts`

Coverage includes copy success, inactive session rejection, no-store headers, short-lived reveal shape, rate limiting, redacted audit payload, merchant route admin UI and log-redaction guards for raw destination keys.

## Validation

- `npm run android:doctor` - passed
- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm test` - passed, 52 files / 360 tests
- `npm run build` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed, services healthy
- `GET http://localhost:8080/api-health` - passed, HTTP 200

Android Gradle validation was not run because Sprint 7C did not touch Android platform code.

## Blockers

No critical blockers.

Non-critical beta follow-ups:

- replace in-memory copy-details rate limiter with shared Valkey-backed limiter before multi-instance production deployment;
- run live visual browser QA against a dev server with Playwright or equivalent;
- add authenticated merchant/operator access control around the minimal route admin surface before production use.

## Next Recommended Sprint

Sprint 7D - Buyer-session and merchant-admin access hardening for hosted checkout private beta.
