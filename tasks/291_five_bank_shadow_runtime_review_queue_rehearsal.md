# Task 291 - Five-bank Shadow Runtime Review Queue Rehearsal

Status: completed

## Scope

Rehearse synthetic review-only signal processing through the signal runtime for all five V1 bank profiles.

## Expected Behavior

- Incoming transfer-like signals route to `needs_review`.
- Review-only/untrusted bank metadata prevents auto-confirm.
- Orders are not moved to `auto_confirmed`.
- Reason codes include review-only or untrusted bank/template context where applicable.

## Result

Runtime tests cover the five-bank fixture set with review-only trust context.
