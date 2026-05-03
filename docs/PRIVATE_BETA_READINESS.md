# Private Beta Readiness

Private beta can start only when the go criteria below are met and no no-go condition is active.

SwimPay is a Payment Signal Engine and not official bank confirmation. Real bank runtime starts review-only, with auto-confirm disabled.

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

Sberbank has review-only package evidence for `ru.sberbankmobile`. The other four banks still need explicit operator package-name input and review-only evidence collection.

Private beta is not ready until the five-bank MVP matrix has enough green review-only coverage for the chosen beta scope.

