# Task 484 - SDK Web product truth guardrails

Sprint: 9B - SDK Web Production Readiness

Goal:
Protect SDK-facing docs/examples from stale or unsafe product claims.

Acceptance:
- Add tests that fail if SDK-facing docs/examples include:
  - `auto_confirm: true`
  - public `payment.signal_detected` fulfillment
  - public `payment.needs_review` fulfillment
  - `official_bank_confirmation=true`
  - secret key in frontend/browser or Android snippets
  - CVV or expiration date collection
  - `J'ai paye` as payment confirmation

Safety:
- SDK examples must preserve manual-confirm-only V1 semantics.
