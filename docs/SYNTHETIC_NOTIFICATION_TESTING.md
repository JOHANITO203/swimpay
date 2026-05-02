# Synthetic Notification Testing

Sprint 4I validates the Android `NotificationListenerService` path using synthetic notifications only.

## Strategy

The chosen V1 smoke strategy is a debug-only synthetic notification source inside the Receiver app.

This strategy:

- requires no real bank app;
- requires no real customer data;
- can be triggered through the debug app or debug broadcast;
- lets the real `NotificationListenerService` receive an Android notification on a real device when Notification Access is enabled;
- marks uploaded metadata as `synthetic_debug_only`.

The synthetic source uses:

```text
package_name: synthetic_debug_only.com.swimpay.syntheticbank
package_cert_sha256: synthetic_debug_only.cert_sha256
bank_profile_id: sber_ru
```

The package and certificate values are not real bank metadata and must never become production trust evidence. The bank profile id is an existing V1 profile so the backend can store the synthetic signal, but the synthetic package/cert remains pending verification and cannot auto-confirm.

## Debug Examples

Incoming synthetic signal:

```text
title: Поступление 137 ₽
body: Перевод от <PERSON> <PHONE>. Коммент <REFERENCE>
```

Negative synthetic examples covered by tests:

- cashback
- refund
- outgoing
- promo
- failed transfer

These must never become Android-side payment confirmations.

## Flow

```text
synthetic Android notification
-> NotificationListenerService
-> synthetic debug package gate
-> snapshot extractor
-> coalescer
-> privacy firewall
-> parser hints
-> persistent protected outbox
-> signed upload
-> backend decision pending or review
```

The backend remains the only decision maker.

## Commands

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080
adb -s R5CWA0FEPZW shell pm grant com.swimpay.receiver android.permission.POST_NOTIFICATIONS
adb -s R5CWA0FEPZW shell am broadcast -a com.swimpay.receiver.DEBUG_SMOKE --es action post_synthetic_notification
adb -s R5CWA0FEPZW shell am broadcast -a com.swimpay.receiver.DEBUG_SMOKE --es action process_synthetic_notification_e2e
```

## Diagnostics

The debug status surface may show:

- Notification Access status;
- listener status;
- backend reachability;
- synthetic debug source status;
- outbox pending count;
- outbox failed retrying count;
- last safe upload/error state.

It must not show raw phone numbers, raw notification text, raw title/body fields or secrets.

## Not Implemented

- No real bank package/cert verification.
- No real bank notification test.
- No production synthetic source.
- No Android payment confirmation.
- No Android auto-confirmation.
- No SMS or Accessibility scraping behavior.
