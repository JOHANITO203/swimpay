# Android Emulator Smoke Test

This smoke path is for the SwimPay Android Receiver MVP. It uses synthetic data only.

## Current Tooling Status

The repository now contains Gradle Android project files under:

```text
apps/android-receiver/android
```

Sprint 4B generated a trusted Gradle wrapper. Global `gradle` is still not available in the current shell, so use the checked-in wrapper:

```powershell
cd apps/android-receiver/android
$env:ANDROID_HOME='C:\Users\Lenovo\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
.\gradlew.bat :app:assembleDebug
```

Do not manually invent or paste a wrapper JAR. Future wrapper upgrades must still use the official Gradle wrapper flow.

Run:

```bash
npm run android:doctor
npm run android:emulator-doctor
```

before attempting any Android build command.

Sprint 4C environment status:

- `adb` is available through the Android SDK `platform-tools` directory.
- Android Emulator command is not installed under the SDK.
- No AVDs are available.
- No running devices are attached.
- The debug APK exists at `apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`.

Because no emulator/device is currently available, APK install and live UI validation are blocked, not passed.

## Build And Install

When Gradle is available:

```bash
cd apps/android-receiver/android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

On Windows PowerShell with a generated wrapper:

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

If `adb` is not in `PATH`, use the SDK path:

```powershell
& 'C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices -l
& 'C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r app/build/outputs/apk/debug/app-debug.apk
& 'C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell pm list packages | Select-String swimpay
& 'C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell am start -n com.swimpay.receiver/.MainActivity
```

## Notification Access

Open Android settings:

```bash
adb shell am start -a android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
```

Enable `SwimPay Receiver`.

Manual wording:

- Android grants broad notification access.
- SwimPay filters locally using the bank allowlist.
- Non-bank notifications are ignored locally.
- Android captures, redacts, signs and uploads operational signals only.
- Backend verifies, matches and decides.
- Android does not confirm or auto-confirm payments.

Expected app wording:

- Android captures, filters, redacts, signs and uploads.
- Backend verifies, matches and decides.
- No payment confirmation is shown by Android.

## Local Backend URL

Start the local backend stack from the repo root:

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml up --build
```

Use the local API URL:

```text
http://10.0.2.2:3000
```

for emulator-to-host access, or the Compose proxy URL if that is how the local stack is exposed.

## Synthetic Flow

1. Register receiver device with synthetic public key.
2. Send signed heartbeat with notification access state and queue length.
3. Upload a synthetic redacted signal.
4. Expect `next_action: backend_decision_pending`.
5. Verify `TO_VERIFY` package/cert metadata routes to review and does not auto-confirm.

If the app-side network client is not wired to UI yet, use the existing local receiver helpers and backend API tests to validate payload shape. This remains an app integration gap, not a payment decision gap.

## Outbox Offline/Online Manual Smoke

When emulator/device testing is available:

1. Configure backend URL to an unreachable local address.
2. Capture or enqueue a synthetic redacted signal.
3. Verify outbox state becomes `pending_upload` or `failed_retrying`.
4. Restore backend URL to `http://10.0.2.2:3000`.
5. Trigger WorkManager retry or wait for scheduled retry.
6. Verify an ack path and no infinite retry loop.

The outbox must store only redacted/signed payloads and must not store raw phone numbers or raw notification text.

## Synthetic Notification Strategy

Until a real fixture app exists, use receiver core tests and backend API calls with synthetic redacted payloads. Do not use real bank app package names or certificate fingerprints.

## Checklist

- No SMS permissions.
- No accessibility scraping service.
- No raw phone displayed.
- No raw notification text displayed.
- No local payment confirmation.
- No local auto-confirmation.
- `TO_VERIFY` remains untrusted.
