# Sprint 4D Report - ADB Real Device Receiver Smoke

generated_at: 2026-05-02T21:58:00+03:00
status: PARTIAL_PASS_BACKEND_BLOCKED

## Objective

Take over real-device ADB setup and run the safest possible Android Receiver smoke path.

## Results

- adb found through the Android SDK.
- phone detected and authorized.
- physical USB serial selected.
- Android build and unit tests pass.
- APK installed successfully.
- package/activity detected.
- app launched successfully.
- adb reverse configured for port `3000`.
- Notification Access enabled at Android system level.
- local backend smoke blocked because the backend is not running and Docker Desktop Linux engine is unavailable.

## adb Path Used

```text
C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

## adb Devices Output Summary

```text
R5CWA0FEPZW device product:dm2qxxx model:SM_S916B device:dm2q transport_id:1
adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp device product:dm2qxxx model:SM_S916B device:dm2q transport_id:2
```

Selected serial:

```text
R5CWA0FEPZW
```

Authorization status: authorized.

## APK Build Status

- `:app:assembleDebug`: PASS
- `:app:testDebugUnitTest`: PASS

## APK Install Status

PASS.

```text
Performing Streamed Install
Success
```

## App Launch Status

PASS.

Package/activity:

```text
com.swimpay.receiver/.MainActivity
```

Launch result:

```text
Events injected: 1
```

## adb reverse Status

PASS.

```text
UsbFfs tcp:3000 tcp:3000
```

## Notification Access Status

PASS at Android system level.

Enabled listener:

```text
com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService
```

Known UI limitation: the current MVP status screen still displays Notification Access as disabled because it uses a static view model input. Platform-state reading remains follow-up work.

## Registration Result

BLOCKED. Local backend unavailable.

## Heartbeat Result

BLOCKED. Local backend unavailable.

## Synthetic Signal Upload Result

BLOCKED. Local backend unavailable and app-side debug trigger is not exposed yet.

## Outbox Offline/Online Result

NOT AUTOMATED YET. App-side debug trigger for enqueue/retry is not exposed yet.

## Validation

- `npm run android:doctor`: PASS
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 34 test files and 237 tests
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace`: PASS
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`: PASS

## Safety Checks

- No real bank notifications used.
- No real customer data used.
- No SMS permission added.
- No SMS reading.
- No bank scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No real bank package names or certificate fingerprints invented.
- No production deployment.
- No production secrets modified.

## Blockers

No critical SwimPay blockers.

Non-critical/local blockers:

- Docker Desktop Linux engine is not running.
- Local API is not reachable on `localhost:3000`.
- Registration/heartbeat/synthetic signal upload cannot be run against the live backend yet.
- App status screen does not yet read live Notification Access state.
- App UI/debug path does not yet trigger synthetic receiver lifecycle requests.

## Next Recommended Sprint

Sprint 4E - Real Device Backend Smoke Wiring:

- start Docker Desktop and Compose stack;
- verify API health on `localhost:3000`;
- keep adb reverse active;
- add a debug-only app smoke trigger for registration, heartbeat and synthetic redacted signal upload;
- keep all payloads synthetic/redacted;
- verify `backend_decision_pending` and no Android-side confirmation.
