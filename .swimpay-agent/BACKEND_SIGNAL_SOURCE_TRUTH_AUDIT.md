# Backend Signal Source Truth Audit

Date: 2026-05-08

## Result

Backend signal ingestion is aligned after a small guardrail fix for legacy payloads.

## Verified

- Receiver device lookup is merchant-bound.
- Receiver private key remains device-side; backend stores/verifies with public key.
- `/v1/receiver/signals` requires signature.
- Duplicate `event_id` is rejected.
- Duplicate `notification_hash` is rejected.
- `local_counter` regressions are rejected.
- Stale/future `observed_at` envelopes are rejected in production mode.
- Inactive, revoked, suspended, reconnect-needed, notification-access-missing and bank-target-missing receiver states are rejected for upload.
- Stored `notification_signals` rows contain redacted/safe metadata only.
- Signal received event is internal (`signal.received`).

## Fixed During Audit

Finding:
- Legacy receiver signal shape (`payload` object form) could accept an envelope carrying nested raw fields if the signature matched the normalized legacy payload.

Fix:
- `apps/api/src/signals.ts` now rejects nested raw notification, raw phone, raw card and credential fields before legacy normalization.

Test:
- `apps/api/src/signals.test.ts` now covers legacy nested raw notification rejection.

## Remaining Caution

- Legacy shape exists for compatibility. It should be retired after Android staging upload is fully on the canonical flat contract.

