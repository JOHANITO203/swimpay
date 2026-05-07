# Task 609 - Manual review and webhook staging flow

Status: blocked_until_staging_order_receiver_and_real_signal_exist

Goal: validate SDK order, hosted checkout, receiver arming, real notification capture, manual merchant confirmation and final public webhook delivery.

Required proof:
- no webhook before manual confirmation;
- `official_bank_confirmation=false`;
- `confirmation_type=notification_signal`;
- no auto-confirmation;
- no internal signal/review fulfillment webhook.

Deliverable:
- `.swimpay-agent/MANUAL_REVIEW_WEBHOOK_STAGING_REPORT.md`
