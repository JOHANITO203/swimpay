# 044 - Receiver Signed Signal Upload Client

## Goal

Implement signed redacted signal upload payload construction and client submission.

## Scope

- Build `POST /v1/receiver/signals` payloads from redacted receiver data.
- Reject raw phone fields and raw notification text.
- Mark `TO_VERIFY` package/cert metadata as untrusted.
- Treat accepted upload as `backend_decision_pending`, never payment confirmation.

## Acceptance Criteria

- Payload shape, signature boundary and privacy rejection are tested.
- No official bank confirmation wording or behavior is introduced.
