# Task 500 - Developer wizard guardrails

Sprint: 9D - Developer Integration Wizard Production Readiness

Goal:
Add tests protecting SDK-facing wizard copy and snippets.

Acceptance:
- No secret key in browser snippets.
- No secret key in Android snippets.
- No webhook secret exposed.
- No raw card/phone/notification payload shown.
- No `payment.signal_detected` or `payment.needs_review` as fulfillment webhooks.
- No `auto_confirm` examples.
- No official bank confirmation claim.
- `payment.confirmed` is post-manual-confirmation only.
- Android snippets do not process webhooks or bank notifications.
- Android snippets do not fulfill locally after return.
