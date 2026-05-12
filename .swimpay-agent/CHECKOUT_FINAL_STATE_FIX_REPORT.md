# Checkout Final State Fix Report

generated_at: 2026-05-12T23:45:00+03:00

## Root Cause Fixed

The backend already persisted merchant manual confirmation to the linked payment session, but the hosted buyer checkout waiting screen did not poll the checkout status endpoint. The buyer stayed on stale HTML until a manual refresh.

## Backend Contract Fix

- Added `Cache-Control: no-store` and `Pragma: no-cache` to `GET /v1/checkout/:id/status`.
- Kept the backend state mapping deterministic:
  - `payment_session.status=manual_confirmed` maps to `checkout_state=confirmed`.
  - `buyer_safe_status=confirmed`.
  - `official_bank_confirmation=false`.
- Made rejected final state explicit in the shared buyer-safe contract:
  - `checkout_state=rejected`.
  - `buyer_safe_status=rejected`.

## Hosted Checkout Fix

- Waiting status cards now include:
  - `data-checkout-status-poll-url`;
  - current internal status;
  - current buyer-safe status.
- The checkout script polls `/checkout/:paymentSessionId/status` every 2.5 seconds.
- Polling uses `cache: 'no-store'` and same-origin credentials.
- Polling reloads the hosted checkout when:
  - buyer-safe status becomes `confirmed`, `rejected`, `expired` or `cancelled`;
  - or the backend session status changes.
- Polling stops on final states and before page unload.
- Network errors are ignored temporarily so the waiting screen remains stable.

## Guardrails Preserved

- No auto-confirmation.
- No real notification processing.
- No public webhook semantic change.
- No raw PAN, raw phone, raw notification or secret exposure.
- No official bank confirmation wording or truthy flag.
