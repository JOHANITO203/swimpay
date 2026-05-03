# Private Beta Readiness

Private beta can start only when the go criteria below are met and no no-go condition is active.

SwimPay is a Payment Signal Engine and not official bank confirmation. Real bank runtime starts review-only, with auto-confirm disabled.

Merchant-facing wording for beta:

- SwimPay recognizes merchant-side notification signals.
- SwimPay does not provide official bank confirmation.
- Review is required in beta.

## Go Criteria

- backend healthy;
- Android Receiver installable;
- Notification Access gate works;
- at least one bank is `approved_for_review_only`;
- package/cert evidence workflow works;
- review queue works;
- webhook delivery works;
- outbox offline/online works;
- no raw PII exposure;
- admin RBAC works;
- no auto-confirm on real banks;
- backup/restore documented;
- merchant permission wording is understandable.

## No-go Criteria

- listener unstable;
- outbox losing signals;
- backend health unstable;
- raw notification storage;
- raw phone storage;
- weak admin auth;
- webhook failures;
- merchant cannot understand Notification Listener Access wording;
- package/cert evidence unclear;
- any flow implies official bank confirmation;
- any real bank flow enables auto-confirm.

## Current Readiness Snapshot

All five V1 banks have package evidence for review-only MVP validation. Sprint 6C rehearsed synthetic shadow runtime for every bank, and Sprint 6D rehearses private beta order, review and webhook behavior with synthetic merchant/order fixtures.

Private beta still requires an explicit go/no-go review before any real bank notification shadow run. Review is required in beta.

## Sprint 6D Rehearsal Criteria

- synthetic merchant/order fixture exists;
- checkout/status path is represented;
- synthetic bank signals route to review queue;
- merchant/operator confirm produces manual review semantics;
- default reject scope is signal-level;
- signed webhook delivery works with `official_bank_confirmation=false` and `confirmation_type=notification_signal`;
- support trace is possible without raw phone or raw notification text.
