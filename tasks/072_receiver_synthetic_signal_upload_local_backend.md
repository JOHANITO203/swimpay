# 072 - Receiver Synthetic Signal Upload Local Backend

## Goal

Smoke a synthetic redacted receiver signal upload against the local backend when runtime/emulator conditions allow.

## Scope

- Use synthetic redacted payload only.
- Use `TO_VERIFY` or `pending_verification` bank metadata.
- Expect backend decision pending, review, or safe pending behavior.

## Acceptance Criteria

- Signal upload status is explicit.
- No payment confirmation is claimed.

## Forbidden Work

- Do not use real bank data.
- Do not upload raw phone or raw notification text.
- Do not invent real package/cert values.
