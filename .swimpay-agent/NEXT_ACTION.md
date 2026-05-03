# Next Action

generated_at: 2026-05-03T20:20:00+03:00

## Latest Sprint

Sprint 7D - Android Merchant App UI/UX Screens, States and API Contracts.

## Current Status

Sprint 7D passed.

Implemented:

1. Android merchant UX language contract and copy constants.
2. Real Android merchant UI surface in `MainActivity` using native views.
3. Onboarding screens for welcome, phone connection, bank choice, receiving method and configuration test.
4. Notification Access gate using Android system settings.
5. Five-bank merchant bank selection with beta manual validation copy.
6. Masked receiving method display for card and phone routes.
7. Dashboard, receiving methods, review queue/detail, connected site and receiver health models.
8. Android frontend API contracts plus mock gap documentation.
9. JVM guardrail tests for exact copy, forbidden jargon, masked PII, developer mode and forbidden permissions.

No real bank notifications were processed. Android still does not confirm or auto-confirm payments.

## Next Recommended Sprint

Sprint 7E - Android merchant API wiring, authenticated review actions and real-device visual QA.

Recommended Sprint 7E scope:

1. Wire Android merchant screens to authenticated backend APIs where available.
2. Implement authenticated merchant review action calls for confirm, reject signal and reject order.
3. Add persistent local UI state for onboarding progress and receiving method drafts.
4. Run real-device visual QA on the Android merchant app screens.
5. Keep real bank notification shadow testing gated behind Sprint 6E consent rules.

## What Not To Do Next

- Do not process real bank notifications without the Sprint 6E consent gate.
- Do not enable real-bank auto-confirmation.
- Do not claim official bank confirmation.
- Do not store raw notification text by default.
- Do not store raw phone/card in webhooks, logs or audit.
- Do not read SMS.
- Do not scrape bank apps.
- Do not use SBP behavior.
- Do not enumerate installed apps broadly.
- Do not treat payer bank launcher selection, destination copy or buyer `I paid` as proof of payment.
