# Next Action

generated_at: 2026-05-03T19:06:22+03:00

## Latest Sprint

Sprint 7C - Checkout Destination Copy Hardening, Merchant Route Admin UX and Browser QA.

## Current Status

Sprint 7C passed.

Implemented:

1. Copy-details session hardening for active, selected, enabled merchant-owned receiving routes.
2. Rate limiting for explicit destination reveals by session, route and coarse client fingerprint.
3. Redacted `checkout.destination_copied` audit events.
4. Short-lived reveal response shape with `reveal_expires_at`, `destination_value`, `masked_identifier`, and no-store/no-cache headers.
5. Hosted checkout proxy no-store/no-cache headers for copy-details.
6. Minimal merchant receiving route admin UI for list/create/disable/recommend actions.
7. Browser-oriented hosted checkout QA coverage through Fastify web tests.
8. Log-redaction guard coverage for raw destination keys.

No real bank notifications were processed. Auto-confirmation remains disabled for real/review-only banks. Copying destination details, payer launcher selection and buyer `I paid` remain non-confirming actions.

## Next Recommended Sprint

Sprint 7D - Buyer-session and merchant-admin access hardening for hosted checkout private beta.

Recommended Sprint 7D scope:

1. Add production-grade buyer checkout session tokens/cookies for hosted checkout access.
2. Move copy-details rate limiting to a shared Valkey-backed limiter for multi-instance deployment.
3. Add authenticated merchant/operator access control around `/admin/merchant-receiving-routes`.
4. Add live browser QA with Playwright or equivalent against the dev server.
5. Keep real-bank notifications review/shadow only and auto-confirm disabled.

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
