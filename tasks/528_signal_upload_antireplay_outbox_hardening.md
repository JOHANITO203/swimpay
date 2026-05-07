# Task 528 - Signal Upload Anti-Replay and Outbox Hardening

## Goals

- Audit and harden event id uniqueness, notification hash uniqueness, local counter monotonicity, signature verification, clock tolerance, duplicate handling and malformed redacted payload rejection.
- Ensure uploaded/stored signal data is redacted only.
- Ensure upload errors never leak raw notification data, secrets, raw phone or raw card.
- Add tests.

## Safety

- Do not store raw notification title/body/bigText/textLines.
- Do not process real notifications.

