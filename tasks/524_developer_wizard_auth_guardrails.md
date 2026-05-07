# Task 524 - Developer wizard auth guardrails

Status: completed

Tests added/updated:
- Production web server does not generate a local development merchant bearer.
- Production explicit `test_*` bearer is refused.
- Production wizard actions stay unavailable without an approved server token.
- Receiving-method write requests include Authorization and Content-Type.
- Production API developer integration routes reject local `Bearer test_*`.

Existing guardrails preserved:
- No auto-confirm examples.
- No official bank confirmation claim.
- No public `payment.signal_detected` / `payment.needs_review` fulfillment webhooks.
- No raw card/phone/notification text in public wizard surfaces.
