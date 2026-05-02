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
```

before attempting any Android build command.

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

## Notification Access

Open Android settings:

```bash
adb shell am start -a android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
```

Enable `SwimPay Receiver`.

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
