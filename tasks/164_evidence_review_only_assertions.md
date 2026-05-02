# 164 - Evidence Review-only Assertions

Status: completed

Goal: assert that evidence review cannot escalate to production trust.

Requirements:

- Approved evidence status is `approved_for_review_only`.
- Response keeps `trusted: false`.
- Response keeps `auto_confirm_enabled: false`.
- Bank profile remains untrusted/review-only.
- Bank app signatures remain unverified for production unless handled by a separate explicit workflow.
- `TO_VERIFY` remains untrusted.
- Android readiness remains review-only for untrusted bank metadata.

Out of scope:

- Any auto-confirmation gate changes.
- Any production trust promotion.
