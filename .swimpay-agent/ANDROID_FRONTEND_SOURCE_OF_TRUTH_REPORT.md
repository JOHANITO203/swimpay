# Android Frontend Source-of-truth Report

generated_at: 2026-05-05T00:00:00+03:00

## Sprint

Sprint 7J — Android Frontend Source-of-truth Cleanup

## Goal

Make `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium` the only active Android merchant visual source of truth.

## Files Audited

Reference search covered:

- Android source
- Android tests
- Android Gradle files
- Android manifest
- docs
- tasks
- `.swimpay-agent`

Targets searched:

- `ui/screens`
- `ui.screens`
- `AndroidMerchantScreenRenderer`
- `AndroidMerchantViewComponents`
- `AndroidMerchantVisualDesign`

Detailed audit:

- `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`

## Files Deleted

Deleted confirmed-dead legacy visual files:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/BankChannelsScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/ConditionsScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/DashboardScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/ExactMerchantMockScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/LandingScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/OnboardingScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/OrdersScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/PhoneSettingsScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/ReviewScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/SecurityCenterScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/SettingsScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/SupportScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/SyncEngineScreen.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantScreenRenderer.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantViewComponents.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantVisualDesign.kt`

## Files Preserved

Preserved high-risk runtime, contract and safety files:

- `MainActivity.kt`
- `PremiumMerchantApp.kt`
- `PremiumMerchantRuntime.kt`
- `AndroidMerchantApiWiring.kt`
- `AndroidMerchantUiModels.kt`
- `NotificationAccessStatusReader.kt`
- `ReceiverOnboardingReadiness.kt`
- `AndroidManifest.xml`

## Tests Replaced / Added

Updated:

- `AndroidMerchantVisualArchitectureTest.kt`

Coverage now asserts:

- `ui/premium` exists and owns active merchant visual files.
- Legacy visual files are absent.
- `MainActivity` mounts `PremiumMerchantApp`.
- `PremiumMerchantRuntime.forAppBuild()` remains the app runtime path.
- Premium bottom tabs exist.
- Premium onboarding uses the notification-settings handoff.
- Premium review actions remain separate.
- `rejectSignal` and `rejectOrder` remain distinct.
- Runtime has safe disconnected mode for non-debug builds.
- Premium UI source does not expose raw card, raw phone, raw notification text, webhook secret or official bank confirmation claims.

Red/green evidence:

- The updated visual architecture test failed before purge because legacy files still existed.
- The same test passed after deleting the confirmed-dead legacy files and refining assertions to allow an empty local `ui/screens` directory.

## Remaining Legacy Files

No Kotlin visual source files remain under `ui/screens`.

Only references to deleted legacy file names remain in the replacement test and reports, where they assert/record the purge.

## Validation Results

- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm test` - passed: 54 files, 382 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- Android targeted red/green:
  - replacement visual architecture test failed before purge because legacy files existed;
  - replacement visual architecture test passed after purge.
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - passed.
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - passed.
- ADB smoke:
  - device visible as Samsung `SM_S916B` / `R5CWA0FEPZW` over ADB mDNS/TLS;
  - debug APK installed successfully;
  - `com.swimpay.receiver/.MainActivity` launched successfully;
  - UIAutomator dump returned the premium app shell with `HOME`, `REVUES`, `VENTES`, `MENU`.

## Safety Assertions

- No backend APIs changed.
- No contracts changed.
- No payment logic changed.
- No review logic changed.
- No real bank notifications processed.
- No auto-confirmation enabled.
- No SMS permission added.
- No Accessibility scraping added.
- No installed-app enumeration added.
- No raw PII exposed.

## Next Recommended Sprint

Sprint 7K — Android Premium Navigation and State Foundation.

Recommended focus:

- typed `PremiumRoute`;
- typed `PremiumTab`;
- reusable `PremiumScreenState`;
- loading/empty/error/action-required states;
- sub-screen navigation foundation for receiving methods, banks, orders, connected site, receiver health and configuration test.
