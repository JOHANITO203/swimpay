# No Notification Manual Fallback Report

Status: completed.

The backend now supports the V1 fallback for the case where the buyer continued to the bank, the receiver is armed, and no matching bank signal arrives after 120 seconds.

Behavior:
- fallback creates review reason `NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT`;
- API response tells the merchant that the payment is pending and requires manual bank check;
- job-worker polling can scan due sessions when `NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true`;
- fallback is idempotent per payment session;
- existing review/signal/final payment state cancels fallback.

Manual confirmation result:
- merchant confirm after fallback produces `confirmation_type=manual_bank_check`;
- `official_bank_confirmation=false`;
- `reason_label=NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED`.

Manual rejection result:
- `reason_label=NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED`.

Forbidden outcomes preserved:
- fallback does not emit `payment.confirmed`;
- fallback does not emit public webhook;
- fallback does not claim official bank confirmation.

Validation:
- API tests cover not-before-120s, due creation, duplicate prevention, existing-review cancellation and final-state cancellation.
- Review tests cover manual fallback confirmation disclosure.
- Job-worker tests cover scheduled scans and disabled state.
- Full Vitest suite passed during closeout.
