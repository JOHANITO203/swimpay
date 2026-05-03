# Beta Merchant Onboarding Flow

This flow is for private beta readiness. It does not authorize production rollout, real bank auto-confirmation or official bank confirmation claims.

## Merchant-facing Positioning

SwimPay detects merchant-side notification signals.

SwimPay does not provide official bank confirmation.

Ambiguous payments require review.

## Flow

1. Install SwimPay Receiver on the merchant Android device.
2. Enable Android Notification Listener Access.
3. Select one bank profile from the V1 list.
4. Register the Receiver device with the backend.
5. Run a synthetic signal test.
6. Create a test order.
7. Receive a signal in review-only mode.
8. Merchant reviews the detected signal.
9. Run webhook/fulfillment test with safe notification-signal wording.

## Permission Wording

Android gives a broad notification access permission. SwimPay applies a local allowlist: only notifications from banks selected by the merchant are analyzed. Other notifications are ignored locally.

Do not say that SwimPay can only read bank notifications. Android grants broader access; SwimPay narrows behavior locally.

## Beta Boundary

- no SMS reading;
- no bank app scraping;
- no official bank confirmation;
- no auto-confirm for real banks;
- no raw phone storage;
- no raw notification text storage by default;
- review-only/shadow-first runtime.

