# Android Merchant Review Notification Report

Date: 2026-05-12

## Implemented

### Manifest

Added `android.permission.POST_NOTIFICATIONS` to the main Android manifest so staging/release builds can request and post merchant review notifications.

### Runtime permission

`MainActivity` now requests `POST_NOTIFICATIONS` on Android 13+.

### Local notification publisher

Added `AndroidMerchantReviewNotifier`:

- channel: `swimpay_merchant_reviews`;
- title: `Commande à vérifier`;
- body: manual validation required copy;
- posts only when the permission is granted;
- never confirms a payment;
- never emits webhooks;
- never treats fallback as a bank signal.

### Review polling hook

`PremiumMerchantApp` now checks the live review queue and posts a local notification once per newly seen action-required review.

Safeguards:

- only non-valid review items notify;
- `notifiedReviewIds` prevents repeated local notifications in the same app session;
- no raw notification text, PAN, phone, API key, or webhook secret is included.

## Expected user-visible behavior

When the job worker creates a `manual_bank_check` review after an armed checkout has no signal for 120 seconds, the Android merchant app should surface:

- review in the review queue;
- local notification: `Commande à vérifier`;
- manual merchant actions remain required.

## Limitations

The Android OS can still suppress local notifications if the user denies `POST_NOTIFICATIONS` or disables the app notification channel.

