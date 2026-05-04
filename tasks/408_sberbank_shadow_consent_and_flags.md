# Task 408 - Sberbank Shadow Consent and Flags

Status: completed_with_pending_live_consent

Scope:
- Create `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md`.
- Record operator consent state for exactly one controlled Sberbank real-notification shadow test.
- Keep real-bank auto-confirm disabled.
- Keep raw notification storage disabled.
- Keep production trust unchanged.
- Keep all non-Sberbank banks out of scope.

Safety:
- Do not capture a real notification until explicit operator consent is recorded.
- Consent must be limited to one controlled Sberbank shadow test.

Result:
- `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md` created.
- Consent state recorded as `pending_explicit_operator_confirmation`.
- Real bank auto-confirm remains disabled.
- Raw notification storage remains disabled by default.
- No production trust mutation was performed.
