# No-Notification Fallback Runtime Audit

Date: 2026-05-12

## Scope

Audit du chemin `Receiver Armed -> 120s timeout -> manual bank check review -> Android merchant notification`.

Rules preserved:

- no auto-confirmation;
- no `payment.confirmed` before merchant manual confirmation;
- no public webhook from fallback;
- `official_bank_confirmation=false`;
- fallback is a manual review request, not a bank notification.

## Findings

### `continue-to-bank`

The backend checkout action already writes `receiver_armed_at` as part of the valid Step 3 flow and does not depend on a successful Android/browser launcher result.

Required state already present in the payment-session flow:

- selected/locked receiving route;
- payer bank launcher kept separate from receiver bank;
- payment instructions shown before arming;
- `receiver_armed_at`;
- no confirmation and no webhook.

### Fallback worker

The runtime worker existed in `apps/job-worker/src/no-notification-fallback.ts`, but deployment configuration did not expose the `NO_NOTIFICATION_FALLBACK_*` variables through Docker Compose / `.env.example`.

Impact:

- code path existed;
- staging could run with fallback disabled by default;
- armed sessions could expire without a generated `manual_bank_check` review.

### Review creation

Both API manual endpoint and job-worker repository create an `open` row in `review_queue` with:

- `reason_code=NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT`;
- `signal_id=NULL`;
- order/session status moved to `needs_review`;
- audit event `no_notification_manual_check_requested`;
- `official_bank_confirmation=false`;
- no public webhook event.

### Android merchant visibility

The Android app already polls `/v1/reviews` for review queue content, but local push-style review notification was not wired for production/staging builds.

Issue found:

- `POST_NOTIFICATIONS` existed only in `src/debug/AndroidManifest.xml`;
- no merchant review notification channel existed for action-required reviews;
- a newly created fallback review could be visible only after user navigation/polling, not as a local notification.

## Diagnosis

The most likely runtime cause of the observed expired checkouts without review is fallback worker activation/configuration, not the review repository itself.

The most likely Android visibility gap is missing production/staging notification permission + local review notification publisher.

