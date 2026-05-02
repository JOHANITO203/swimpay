# 141 — Bank Profile Selection Model

## Goal

Implement a safe receiver-side selected bank profile model before any real bank package or certificate dry run.

## Scope

- Support `bank_profile_id`, `display_name`, `package_name`, `package_cert_sha256`, `verification_status`, `selected`, `review_only`, and `synthetic_debug_only`.
- Keep V1 real bank profiles with `TO_VERIFY` or `pending_verification` untrusted.
- Allow selected unverified banks to enable detection/review-only mode, not auto-confirmation.
- Keep synthetic debug profiles debug-only and not production trust evidence.

## Safety Rules

- Do not invent real bank package names.
- Do not invent real signing certificate fingerprints.
- Do not trust `TO_VERIFY` values.
- Android must never confirm or auto-confirm payment.
- Do not store or expose raw phone numbers or raw notification text.

## Validation

- Add tests for no selected bank, selected `TO_VERIFY`, selected synthetic debug profile, unknown bank rejection, and no automatic trust promotion.
