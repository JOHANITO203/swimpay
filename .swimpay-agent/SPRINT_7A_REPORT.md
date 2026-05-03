# Sprint 7A Report - PSP-like Checkout Bank Selection Flow

generated_at: 2026-05-03T17:16:00+03:00

status: passed

## Summary

Sprint 7A implemented a buyer-facing "Pay with SwimPay" checkout flow while
preserving SwimPay as a Payment Signal Engine.

No real bank notifications were processed. No real-bank auto-confirmation was
enabled. No SMS, SBP, bank-app scraping, broad app enumeration, raw PII exposure
or official bank confirmation wording was added.

## Tasks

- `340_checkout_receiver_bank_selection_model` - completed
- `341_payer_bank_launcher_registry` - completed
- `342_checkout_session_state_machine` - completed
- `343_checkout_bank_selection_api` - completed
- `344_hosted_checkout_multistep_ux` - completed
- `345_bank_launcher_open_app_fallback` - completed
- `346_checkout_status_polling_and_events` - completed
- `347_developer_webhook_plugin_flow` - completed
- `348_psp_like_checkout_e2e_tests` - completed
- `349_sprint_7a_closeout_review` - completed

## Receiver Bank Model

Added checkout receiver-bank contracts for the five V1 merchant-side receiver
banks:

- `sber_ru`
- `tbank_ru`
- `vtb_ru`
- `alfa_ru`
- `gazprombank_ru`

All V1 receiver banks are exposed as `review_only=true`,
`detection_supported=true`, `auto_confirm_enabled=false` and
`official_bank_confirmation=false`.

## Payer Launcher Registry

Added payer-bank launcher options as buyer-side UX helpers only:

- Sberbank
- T-Bank
- VTB
- Alfa-Bank
- Gazprombank
- YooMoney
- Ozon Bank
- MTS Bank
- Post Bank
- Raiffeisen
- Other bank / manual transfer

Launchers have no verified deeplink guarantees in this sprint. Unknown and
unverified launchers fall back to copy/manual transfer. Launcher selection does
not prove payment, influence trust, or enable confirmation.

## Checkout State Machine

Added buyer-facing checkout states and safe status mapping:

- `receiver_bank_selection`
- `payer_bank_launcher_selection`
- `payment_instructions`
- `awaiting_payment`
- `buyer_claimed_paid`
- `signal_detected`
- `needs_review`
- `confirmed`
- `expired`
- `rejected`

`buyer_claimed_paid` maps to `searching_signal` and never confirms payment.
`signal_detected` also does not confirm payment.

## Checkout Bank Selection API

Added buyer-safe checkout endpoints:

- `GET /v1/checkout/:session_id/receiver-banks`
- `POST /v1/checkout/:session_id/receiver-bank`
- `GET /v1/checkout/:session_id/payer-bank-launchers`
- `POST /v1/checkout/:session_id/payer-bank-launcher`
- `POST /v1/checkout/:session_id/payment-instructions-shown`
- `POST /v1/checkout/:session_id/claimed-paid`
- `GET /v1/checkout/:session_id/status`

Selections persist on `payment_sessions` through additive migration
`006_checkout_bank_selection.sql`. Mutations write audit events:

- `checkout.receiver_bank_selected`
- `checkout.payer_bank_launcher_selected`
- `checkout.payment_instructions_shown`
- `checkout.buyer_claimed_paid`

Expired sessions reject checkout mutations.

## Hosted Checkout UX

Updated `swimpay-web` hosted checkout to a mobile-first multi-step flow:

1. Pay with SwimPay intro.
2. Merchant receiver-bank selection.
3. Payer launcher selection.
4. Buyer identity hints.
5. Amount/reference payment instructions.
6. Awaiting signal.
7. Result/status.

Required safe wording is present:

```text
SwimPay recherchera le signal de paiement côté marchand.
```

Copy amount/reference controls and manual bank fallback are present.

## Runtime and Webhooks

Review-only matched signals now emit public webhook requests in this order:

1. `payment.signal_detected`
2. `payment.needs_review`

Both include:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

`payment.confirmed` remains available only for manual review or controlled
release paths.

## Tests Added or Updated

- `packages/contracts/src/checkout.test.ts`
- `apps/api/src/payment-sessions.test.ts`
- `apps/web/src/checkout.test.ts`
- `apps/signal-worker/src/runtime.test.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `tests/psp-like-checkout-flow.test.ts`
- updated existing durable/private-beta runtime tests for the new
  `payment.signal_detected -> payment.needs_review` sequence

## Documentation

- Created `docs/SWIMPAY_CHECKOUT_BANK_SELECTION_FLOW.md`.
- Created/updated `docs/DEVELOPER_PLUGIN_INTEGRATION.md`.
- Updated `docs/PRIVATE_BETA_READINESS.md`.
- Updated `docs/05_DATABASE_SCHEMA.md`.

## Validation

- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 51 test files / 344 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, all services healthy
- `GET http://localhost:8080/api-health` - PASS, dependencies `database`, `nats`, `valkey` all `ok`

Android Gradle checks were not run because Sprint 7A did not touch Android code.

## Blockers

No critical blockers.

Known non-critical limitation: payer launcher deeplinks are not verified; Sprint
7A intentionally uses manual/copy fallback unless a launcher URL is explicitly
known in future work.

## Next Recommended Sprint

Sprint 7B - Hosted checkout browser QA, merchant receiver-account instructions,
and developer plugin sandbox rehearsal.
