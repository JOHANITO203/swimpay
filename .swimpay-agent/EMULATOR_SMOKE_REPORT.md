# Emulator Smoke Report

generated_at: 2026-05-02T21:05:00+03:00
status: BLOCKED_BY_LOCAL_EMULATOR_ENVIRONMENT

## Summary

Sprint 4C prepared the Android Emulator smoke validation path and verified the local Android build artifacts are present, but live emulator validation could not be completed because this machine currently has no Android Emulator command, no configured AVD and no running Android device.

This is not a SwimPay product blocker and not a repository validation failure. It is a local Android emulator environment blocker.

## Repository Validation

- `npm run android:doctor`: PASS
- `npm run android:emulator-doctor`: PASS as diagnostic, live emulator smoke BLOCKED
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace`: PASS
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`: PASS
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

## Emulator Availability

- Android SDK path: `C:\Users\Lenovo\AppData\Local\Android\Sdk`
- `adb`: available through SDK platform-tools
- `adb` version: Android Debug Bridge `1.0.41`, version `37.0.0-14910828`
- Emulator command: not available at `C:\Users\Lenovo\AppData\Local\Android\Sdk\emulator\emulator.exe`
- Available AVDs: none detected
- Running devices: none detected

## APK Status

- Debug APK exists: `apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- APK install status: not run
- Reason: no running emulator/device is available for `adb install`

## Notification Access flow status

Status: documented/manual-ready, not live-validated.

Expected user-visible guidance:

- Android grants broad notification access.
- SwimPay filters locally using the configured bank allowlist.
- Non-bank notifications are ignored locally.
- SwimPay captures, redacts, signs and uploads operational payment signals only.
- Backend decides the final outcome.
- Android never confirms or auto-confirms a payment.

Static checks remain in place:

- Notification Listener Service declaration exists.
- SMS permissions are not declared.
- Accessibility or scraping service behavior is not added.

## Receiver Registration And Heartbeat

Status: blocked for live app/emulator validation.

Prepared path:

- local backend URL for emulator: `http://10.0.2.2:3000`
- receiver registration endpoint: `POST /v1/receiver-devices/register`
- heartbeat endpoint: `POST /v1/receiver-devices/heartbeat`

Live result:

- not run from emulator app
- reason: no emulator/device available

## Synthetic Signal Upload

Status: blocked for live app/emulator validation.

Prepared expectation:

- use synthetic redacted data only
- use `TO_VERIFY` or `pending_verification` bank app metadata
- backend response may accept the signal as `backend_decision_pending`
- accepted signal must not mean payment confirmation
- `TO_VERIFY` bank metadata must not auto-confirm

Live result:

- not run from emulator app
- reason: no emulator/device available

## Outbox offline/online result

Status: blocked for live emulator validation.

Prepared expectation:

- when backend is unreachable, redacted signed payload remains in local outbox
- state becomes pending retry or failed retrying
- retry schedule is bounded
- no raw phone or raw notification text is stored
- no infinite retry loop

Live result:

- not run on emulator
- reason: no emulator/device available

## Blockers

Non-critical local environment blockers:

- Android Emulator package is not installed or not discoverable under the SDK.
- No AVD is configured.
- No running emulator/device is attached through adb.
- Live APK install, Notification Access validation, receiver registration, heartbeat, signal upload and outbox retry smoke could not be executed.

## Next Real-Device Or Emulator Steps

1. Install Android Emulator and Android SDK command-line tools through Android Studio SDK Manager.
2. Create an AVD, for example Pixel API 35 or equivalent.
3. Start the AVD and verify `adb devices -l` shows one running device.
4. Run `npm run android:emulator-doctor`.
5. Install the APK with SDK adb.
6. Enable Notification Access manually for SwimPay Receiver.
7. Run the local backend and repeat the receiver register, heartbeat and synthetic signal upload smoke path.
