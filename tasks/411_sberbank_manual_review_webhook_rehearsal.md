# Task 411 - Sberbank Manual Review and Webhook Rehearsal

Status: blocked_no_review_row

Scope:
- Manually confirm only if the operator verifies the controlled test payment.
- Use backend review confirm endpoint.
- Android must not decide directly.
- Android must not send developer webhooks directly.

Webhook expectation after manual confirm:
- `confirmation_type=notification_signal`
- `official_bank_confirmation=false`
- `decision=manual_confirmed`
- No raw PII.

Result:
- Not executed because no review row was created from a captured Sberbank notification.
- No manual confirm was performed.
- No webhook was emitted.
