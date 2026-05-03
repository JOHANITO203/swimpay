# Next Action

generated_at: 2026-05-03T17:16:00+03:00

## Latest Sprint

Sprint 7A - PSP-like Checkout Bank Selection Flow.

## Current Status

Sprint 7A passed.

Implemented:

1. Receiver-bank selection model for the five V1 merchant-side banks.
2. Payer-bank launcher registry as UX-only metadata.
3. Checkout state machine and buyer-safe status mapping.
4. Checkout bank-selection/status APIs.
5. Hosted multi-step checkout UX.
6. Manual/copy fallback for bank launchers.
7. `payment.signal_detected` then `payment.needs_review` review-first public webhook sequence.
8. Developer plugin integration docs and synthetic E2E rehearsal.

No real bank notifications were processed. Auto-confirmation remains disabled for
real/review-only banks.

## Next Recommended Sprint

Sprint 7B - Hosted checkout browser QA, merchant receiver-account instructions,
and developer plugin sandbox rehearsal.

Recommended Sprint 7B scope:

1. Verify hosted checkout visually in browser across mobile/desktop viewports.
2. Add merchant receiver-account display/configuration model for checkout instructions.
3. Add a sandbox developer plugin sample consuming signed webhooks.
4. Add checkout expiry/retry UX polish.
5. Keep all real-bank paths review-only and all official-bank-confirmation claims forbidden.

## What Not To Do Next

- Do not process real bank notifications without the Sprint 6E consent gate.
- Do not enable real-bank auto-confirmation.
- Do not claim official bank confirmation.
- Do not store raw notification text by default.
- Do not store raw phone.
- Do not read SMS.
- Do not scrape bank apps.
- Do not use SBP behavior.
- Do not enumerate installed apps broadly.
- Do not treat payer bank launcher selection as proof of payment.
