# Next Action

generated_at: 2026-05-03T18:27:43+03:00

## Latest Sprint

Sprint 7B - Bank-first Hybrid Receiving Routes.

## Current Status

Sprint 7B passed.

Implemented:

1. Merchant receiving route model for `phone_transfer` and `card_transfer`.
2. Additive receiving-route storage and checkout route selection APIs.
3. Buyer sender phone matching hint stored as HMAC/masked value only.
4. Human-readable payment reference generator.
5. Bank-first hosted checkout route reveal flow.
6. Route-aware matching/risk reason codes.
7. Safe route context in webhook payloads without raw card/phone.
8. Synthetic E2E and API/web/runtime coverage.

No real bank notifications were processed. Auto-confirmation remains disabled for real/review-only banks. Payer launcher selection remains UX-only and proves nothing.

## Next Recommended Sprint

Sprint 7C - Checkout destination copy hardening, merchant route admin UX and hosted checkout browser QA.

Recommended Sprint 7C scope:

1. Harden the explicit destination copy endpoint with buyer-session protection, rate limits and short-lived reveal policy.
2. Add merchant route administration UX for phone/card receiving routes.
3. Verify hosted checkout visually in browser across mobile/desktop viewports.
4. Add copy/open-bank interaction QA and accessibility checks.
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
