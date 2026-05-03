# Task 375 - Copy details rate limit and audit

Status: completed

Scope:
- Add lightweight copy-details rate limiting by session, selected route and coarse client fingerprint.
- Return a safe error once the threshold is exceeded.
- Write redacted `checkout.destination_copied` audit events.
- Audit includes session id, route id, rail type and masked identifier only.

Validation:
- Tests verify rate limit behavior and audit redaction.
- Raw card, raw phone and full receiver identifiers are not present in audit payloads.
