# 093 Android Debug Synthetic Signal Upload Action

## Goal

Wire the debug-only Android synthetic signal upload action to the backend.

## Scope

- Upload synthetic redacted notification signal.
- Use `TO_VERIFY` package/cert metadata.
- Sign the payload with synthetic local debug key material.
- Expected result is accepted or `backend_decision_pending`, never Android confirmation.

## Forbidden

- Do not use real bank notifications.
- Do not upload raw phone.
- Do not upload raw notification text.
- Do not invent real bank packages/certs.

## Acceptance Criteria

- Signal action sends a signed redacted payload.
- UI wording includes notification signal, backend decision pending and not official bank confirmation.
- Tests cover payload shape and safe output.

