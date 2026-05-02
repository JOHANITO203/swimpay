# 087 Real Device Synthetic Signal Upload Smoke

## Goal

Upload a synthetic redacted Receiver signal against the local backend smoke path.

## Scope

- Use only synthetic TO_VERIFY or pending_verification metadata.
- Upload no raw phone and no raw notification text.
- Verify accepted means backend decision pending, not payment confirmation.

## Forbidden Work

- Do not use real bank notifications.
- Do not invent real bank package names or cert fingerprints.
- Do not bypass backend signal verification.
- Do not weaken auto-confirmation gates.

## Acceptance Criteria

- Synthetic upload result is documented.
- `official_bank_confirmation` is never true.
- TO_VERIFY metadata cannot auto-confirm.

