# Checkout Final State Propagation Audit

generated_at: 2026-05-12T23:25:00+03:00

## Scope

Audit of merchant review decision propagation to buyer hosted checkout.

## A. Merchant Review Decision

- route: `POST /v1/reviews/:id/confirm`.
- backend service: `PgReviewRepository.confirmReview`.
- status persistence:
  - review `open -> confirmed`;
  - order `status -> manual_confirmed`;
  - payment_session `status -> manual_confirmed`;
  - active amount lease `status -> used`.
- webhook: emitted only after manual decision through the review action internal event.
- audit: review action audit event is inserted with actor metadata.
- classification: `aligned`.

## B. Checkout Status Endpoints

- API read endpoint: `GET /v1/payment-sessions/:id`.
- API status endpoint: `GET /v1/checkout/:id/status`.
- Hosted web status endpoint: `GET /checkout/:paymentSessionId/status`.
- id used: `payment_session_id`.
- mapping contract:
  - `manual_confirmed -> checkout_state=confirmed`;
  - `confirmed -> buyer_safe_status=confirmed`.
- current gap: status endpoints can expose the final status, but browser polling was not wired to consume it automatically.
- classification: `partial`.

## C. Hosted Checkout Waiting Screen

- waiting screen renders final states when the page is loaded with `status=manual_confirmed`.
- current script has a countdown `setInterval`, but no checkout status polling loop.
- therefore a buyer who remains on the waiting screen after merchant confirmation keeps stale HTML until manual refresh.
- classification: `frontend_polling_missing`.

## D. External App Flow

- SDK order returns `checkout_url` bound to `payment_session_id`.
- hosted checkout reads by `payment_session_id`.
- merchant review actions update the same persisted payment session when the review references the session.
- no evidence of wrong id mapping in local code.
- classification: `aligned`, with staging smoke still required.

## Root Cause

The buyer checkout final state was not automatically refreshed because the hosted checkout status screen did not poll `/checkout/:paymentSessionId/status`. Backend state propagation existed, but the browser UI held stale HTML.

## Guardrails Verified

- No auto-confirmation.
- `payment.confirmed` remains final-only after merchant manual action.
- `official_bank_confirmation=false`.
- No raw PAN/phone/notification exposure.
