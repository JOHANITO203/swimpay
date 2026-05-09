# Task 722 - No Notification Manual Fallback

Status: completed

Objective:
Create a manual-check fallback when a buyer has continued to the bank, the receiver is armed, an expected payment profile exists, and no matching signal/review arrives after 120 seconds.

Behavior:
- creates internal audit event `no_notification_manual_check_requested`;
- creates a merchant review with reason `NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT`;
- notifies merchant with safe copy only;
- never confirms payment;
- never emits public webhook;
- manual confirm after fallback uses `confirmation_type=manual_bank_check`;
- `official_bank_confirmation=false`.

Cancellation:
- matching signal or existing open review blocks fallback;
- final states block fallback;
- duplicate fallback per payment session is blocked by persistence and unique index.

Evidence:
- `apps/api/src/orders.ts`
- `apps/api/src/server.ts`
- `apps/api/src/reviews.ts`
- `apps/job-worker/src/no-notification-fallback.ts`
- `packages/database/migrations/015_no_notification_fallback_and_ozon_bank.sql`

