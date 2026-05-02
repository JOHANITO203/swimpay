# 084 Android Live Notification Access Status

## Goal

Wire the Android Receiver status model/UI to the real Android Notification Access state where platform APIs are available.

## Scope

- Add a platform status reader for enabled notification listener packages.
- Keep a testable pure parser/fake for JVM tests.
- Update the app status screen to show live Notification Access.
- Preserve safe fallback behavior.

## Forbidden Work

- Do not add SMS permissions.
- Do not add Accessibility scraping services.
- Do not read or display raw notifications.
- Do not implement payment confirmation on Android.

## Acceptance Criteria

- JVM tests cover enabled and disabled listener detection.
- Manifest still declares NotificationListenerService only.
- App status can reflect enabled Notification Access on device.

