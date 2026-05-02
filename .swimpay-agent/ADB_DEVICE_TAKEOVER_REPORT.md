# ADB Device Takeover Report

generated_at: 2026-05-02T21:58:00+03:00
status: PASS_WITH_BACKEND_BLOCKED

## adb Path Used

ADB was not available in `PATH`.

`ANDROID_HOME` and `ANDROID_SDK_ROOT` were not set in this shell.

ADB was found and used from:

```text
C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

## Device Detection

`adb devices -l` returned two authorized entries for the same Samsung phone:

```text
R5CWA0FEPZW device product:dm2qxxx model:SM_S916B device:dm2q transport_id:1
adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp device product:dm2qxxx model:SM_S916B device:dm2q transport_id:2
```

Selected device serial:

```text
R5CWA0FEPZW
```

Reason: direct physical USB device entry.

Authorization status: authorized.

## APK Build And Install

- `:app:assembleDebug`: PASS
- `:app:testDebugUnitTest`: PASS

APK path:

```text
apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk
```

Install result:

```text
Performing Streamed Install
Success
```

Installed package:

```text
package:com.swimpay.receiver
```

## Package And Launch

Detected application id:

```text
com.swimpay.receiver
```

Detected launch activity:

```text
com.swimpay.receiver/.MainActivity
```

Launch result:

```text
Events injected: 1
```

Process check:

```text
pidof com.swimpay.receiver -> 15273
```

## adb reverse

Result:

```text
UsbFfs tcp:3000 tcp:3000
```

Android debug backend URL:

```text
http://127.0.0.1:3000
```

## Notification Access

Settings screen was opened through Android settings. The system enabled notification listener list now includes:

```text
com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService
```

Notification Access status: enabled at Android system level.

Known limitation: the MVP status screen still displays `Notification access: disabled` because the current screen uses static view-model input and does not yet read the platform setting dynamically.

## Permission Safety Check

Confirmed:

- `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` is declared on the listener service.
- no SMS permission was found.
- no Accessibility Service scraping permission was found.

Observed requested permissions:

- `FOREGROUND_SERVICE`
- `RECEIVE_BOOT_COMPLETED`
- `ACCESS_NETWORK_STATE`
- `WAKE_LOCK`

These do not add SMS reading or bank app scraping.

## Backend Status

Local API health:

```text
http://localhost:3000/health -> failed/timeout
```

Docker Compose runtime:

```text
Docker Desktop Linux engine pipe not found.
```

Backend status: not running locally.

This blocks receiver registration, heartbeat and synthetic signal upload against a live backend from the phone.
