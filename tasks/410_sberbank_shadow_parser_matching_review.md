# Task 410 - Sberbank Shadow Parser, Matching and Review

Status: blocked_no_real_signal

Scope:
- Parse the redacted Sberbank signal if one is captured.
- Classify direction.
- Extract amount/currency/reference/identity only from redacted/safe fields.
- Match against the controlled test order/session.
- Create review-first result only.

Expected:
- `needs_review` or equivalent review-first status.
- No auto-confirm.
- No `payment.confirmed` webhook before manual review.
- `official_bank_confirmation=false`.

Result:
- Not executed because no real redacted Sberbank notification was captured.
- No parser, matching or review mutation was performed.
