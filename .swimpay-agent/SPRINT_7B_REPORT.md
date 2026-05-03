# Sprint 7B Report - Bank-first Hybrid Receiving Routes

generated_at: 2026-05-03T18:27:43+03:00

status: PASS

## Summary

Sprint 7B implemented the bank-first checkout destination model for SwimPay V1. The buyer now selects a merchant-side receiver bank first, then sees only the buyer-safe receiving routes configured for that bank. Payer bank launchers remain UX-only and never prove payment.

No real bank notifications were processed. No SMS, SBP behavior, bank app scraping, broad installed-app enumeration, official bank confirmation claim or real-bank auto-confirmation was added.

## Tasks

- `350_hybrid_receiving_route_model` - completed.
- `351_receiving_route_storage_and_api` - completed.
- `352_buyer_sender_phone_matching_hint` - completed.
- `353_human_readable_payment_reference_generator` - completed.
- `354_checkout_bank_first_route_reveal_ui` - completed.
- `355_hybrid_route_matching_risk_policy` - completed.
- `356_webhook_route_context_no_pii` - completed.
- `357_hybrid_receiving_routes_e2e_tests` - completed.
- `358_sprint_7b_closeout_review` - completed.

## Hybrid Route Model

Added `MerchantReceivingRoute` with V1 rails:

- `phone_transfer`
- `card_transfer`

Routes store a merchant, bank profile, encrypted receiver identifier, masked receiver identifier, route code, display label, enabled/recommended flags and review policy. Receiver route selection is separate from payer launcher selection.

Beta policy remains review-first:

- `card_transfer` defaults to `review_first`.
- `phone_transfer` may be marked `eligible_low_risk_later`, but it does not auto-confirm by default.

## Storage And API

Added additive migration `007_hybrid_receiving_routes.sql`.

Added merchant route APIs:

- `POST /v1/merchant/receiving-routes`
- `GET /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`

Added checkout route APIs:

- `GET /v1/checkout/:session_id/receiver-banks` groups buyer-safe receiver banks with route summaries only.
- `GET /v1/checkout/:session_id/receiver-banks/:bank_profile_id/routes` reveals buyer-safe route choices after bank selection.
- `POST /v1/checkout/:session_id/receiving-route` persists selected route.
- `GET /v1/checkout/:session_id/receiving-route/copy-details` returns the configured destination only as an explicit buyer copy action.
- `POST /v1/checkout/:session_id/buyer-sender-phone` stores an optional matching hint as HMAC and masked value only.

Raw receiver identifiers are not returned by status, webhook, audit or route list/detail responses.

## Buyer Sender Phone Hint

The optional buyer sender phone hint is stored as:

- `buyer_sender_phone_hmac`
- `buyer_sender_phone_masked`

The raw phone is not persisted by default and is not exposed in webhook or audit payloads. Matching can use the HMAC as a hint only.

## Human-readable Reference

Added a two-word uppercase payment reference generator with three-word collision fallback. The reference is scoped by merchant, receiving route and active payment window. The product reason is simple UX: less typing friction and fewer reference errors.

## Hosted Checkout UX

Hosted checkout is now bank-first:

1. Intro.
2. Receiver bank selection with logos/names only.
3. Route reveal after bank selection.
4. Payer launcher selection.
5. Payment instructions.
6. Awaiting signal / signal detected / needs review / confirmed / expired.

The bank selection step does not show card or phone details. The instruction step shows masked destination, exact amount, human-readable reference, optional sender phone hint for phone routes, open-bank fallback and "I paid".

Buyer-facing copy avoids official confirmation claims and uses the safe positioning: SwimPay looks for the merchant-side receipt signal.

## Matching And Risk Policy

Added route risk reason codes:

- `phone_transfer_matching_hint_available`
- `buyer_sender_phone_missing`
- `card_transfer_review_required`
- `reference_not_observed`
- `amount_only_card_transfer`
- `receiver_route_review_only`
- `receiving_route_not_selected`

Card routes remain review-first in beta. Phone sender hint improves scoring/reasoning but does not enable default auto-confirm. Amount-only and collision cases continue to route away from auto-confirm.

## Webhook Route Context

Developer webhook payloads can now include safe route context:

- `receiver_route_code`
- `rail_type`
- `payment_reference`
- `receiver_bank_id`
- `confirmation_type=notification_signal`
- `official_bank_confirmation=false`

Webhook and worker PII guards reject raw card, raw phone, raw receiver identifier fields and raw notification text.

## Tests

Added or updated coverage for:

- route contract conversion and masking
- receiver bank route summaries
- merchant route create/list/update APIs
- route reveal and selection APIs
- explicit copy-details action
- buyer sender phone HMAC/masked storage
- human-readable reference format and collision fallback
- route risk reason codes
- matching with sender-phone hint
- card amount-only review-first behavior
- webhook route context without raw identifiers
- bank-first checkout UI behavior
- synthetic PSP-like checkout E2E state flow

Full repository test run passed: 51 test files, 354 tests.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`

Android Gradle checks were not run because Sprint 7B did not touch Android app code.

## Blockers

No critical blockers.

Non-critical beta hardening remains:

- The explicit receiving-route copy endpoint needs production-grade buyer-session hardening, rate limiting and short-lived reveal policy before private beta.
- Hosted checkout should receive visual browser QA across mobile and desktop viewports.
- Merchant route administration UI is still minimal/API-first.

## Next Recommended Sprint

Sprint 7C - Checkout destination copy hardening, merchant route admin UX and hosted checkout browser QA.
