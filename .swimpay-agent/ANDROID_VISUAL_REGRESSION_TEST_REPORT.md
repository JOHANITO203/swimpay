# Android Visual Regression Test Report

generated_at: 2026-05-12T20:05:00+03:00

## Automated Screenshot Status

No pixel/golden screenshot framework is currently configured.

Not present:

- Paparazzi
- Roborazzi
- Shot
- Compose screenshot testing
- `src/androidTest`
- versioned golden baselines

## Added Gate Now

Added static JVM guardrails in `AndroidMerchantVisualArchitectureTest` for:

- asset registry assumptions;
- official launcher resource wiring;
- forbidden ad-hoc runtime logo assets;
- required token primitives.

This is not a golden screenshot test.

## Validation Run

Executed on 2026-05-12:

- Targeted Android JVM visual architecture test: passed.
- `npm run android:doctor`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 77 files / 672 tests.
- `npm run build`: passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: passed.
- Android `:app:testDebugUnitTest`: passed.
- Android `:app:assembleDebug`: passed.

No automated screenshot record/verify command exists yet.

## Manual Screenshot QA Protocol

Until Paparazzi/Roborazzi is introduced:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$out = "$env:TEMP\swimpay-android-visual"
New-Item -ItemType Directory -Force $out | Out-Null

apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleStaging --no-daemon --stacktrace --max-workers=1
& $adb devices -l
& $adb install -r "apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk"
& $adb shell monkey -p com.swimpay.receiver -c android.intent.category.LAUNCHER 1
& $adb exec-out screencap -p > "$out\01_launch.png"
& $adb exec-out uiautomator dump /dev/tty > "$out\01_launch.xml"
```

Required manual captures:

- dashboard;
- review list;
- review detail;
- receiver health;
- receiving methods;
- developer integration;
- confirmation mode.

## Recommendation

Add Paparazzi in the next visual sprint for JVM-friendly Compose screenshot baselines.
