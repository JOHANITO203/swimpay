# Task 461 — Durable Intelligence Feedback Storage

Status: completed

Scope:
- Add additive PostgreSQL migration for passive Intelligence feedback and unknown-shape monitoring.
- Store only redacted/safe metadata.
- Keep `official_bank_confirmation=false`, `mutates_runtime_rules=false`, `promotes_profile=false`.

Safety:
- Do not store raw notification title/body/text.
- Do not store raw phone/card.
- Do not connect feedback storage to payment decisions.

