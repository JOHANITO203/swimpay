# Task 356 - Webhook Route Context Without PII

Status: completed in Sprint 7B.

Scope:
- Include safe route context in signal/review/confirmation webhook payloads.
- Document developer plugin flow with receiver route context.

Safety:
- Webhooks include `confirmation_type=notification_signal` and `official_bank_confirmation=false`.
- Raw card, raw phone, raw notification text, buyer sender raw phone, and personal merchant identity are excluded.
