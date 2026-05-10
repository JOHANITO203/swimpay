# Merchant Readiness Gate Report

generated_at: 2026-05-10T11:45:00+03:00

## Summary

The Merchant Readiness Gate is implemented before payable checkout/order creation.

A merchant is not payment-ready unless at least one active checkout-safe receiving route exists. Routes must already pass the existing checkout route filters: supported method, not deleted, not disabled, not revoked, acceptable certification and usable by checkout.

No payment runtime semantics changed:

- no real bank notification capture;
- no auto-confirmation;
- no `payment.confirmed` semantic change;
- no public webhook semantic change;
- no raw PAN, raw phone, notification text or secrets exposed.

## Backend

Added a shared readiness contract:

- `merchant_setup_status`;
- `payment_ready`;
- `active_receiving_route_count`;
- `available_payment_methods`;
- `setup_actions`;
- `unavailable_reason`;
- `manual_fallback_ready`;
- `signal_assisted_ready`;
- `official_bank_confirmation=false`.

Added `GET /v1/merchant/readiness`.

Added SDK/API-key order creation gate:

- no active receiving route returns structured `409 merchant_payment_setup_required`;
- no usable payable checkout URL is created;
- no order is persisted;
- no payment session is persisted;
- no amount lease is allocated;
- no Expected Payment Profile is created;
- no receiver can be armed from this path.

The gate intentionally uses existing route discovery/certification/lifecycle logic instead of creating a parallel definition of readiness.

## Android Merchant App

The dashboard summary now consumes backend readiness fields and surfaces:

> Ajoutez un moyen de reception pour activer les paiements.

When `payment_ready=false`, the app displays an action-required state instead of claiming SwimPay is ready.

## Web Merchant Dashboard

The merchant dashboard and connected-site page now inspect merchant receiving routes and show an action-required state when no active route exists.

The connected-site surface shows:

> Paiements indisponibles tant qu'aucun moyen de reception n'est configure.

## SDK

The Node SDK test coverage now verifies that `merchant_payment_setup_required` remains a typed API error with setup details instead of being hidden behind a generic failure.

## Tests Added Or Updated

- backend readiness endpoint;
- SDK/API-key order creation blocked for no-route merchant;
- readiness changes after adding and disabling the last active route;
- Android dashboard action-required copy;
- web dashboard action-required state;
- connected-site payment unavailable copy;
- historical order/auth/prod/durable-worker fixtures updated to include an active route when testing payable merchants.

## Validation

Passed:

- `npm run android:doctor`;
- `npm run typecheck`;
- `npm run lint`;
- `npm test` — 77 files, 619 tests;
- `npm run build`;
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`;
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`;
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`.

## Migration

No new database migration is required for this addendum. The gate uses existing receiving-route lifecycle and certification data.

## Next Step

Redeploy staging and re-test:

1. merchant with no active receiving route cannot create a payable SDK order;
2. Android dashboard shows the receiving-method action required state;
3. web merchant dashboard shows the same readiness warning;
4. buyer checkout opened from a stale URL shows a clean unavailable state.
