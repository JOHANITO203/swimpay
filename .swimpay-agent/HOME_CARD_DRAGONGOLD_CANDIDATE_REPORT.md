# Home Card DragonGold Candidate Report

## Decision

DragonGold is now the Home Dashboard card candidate and replaces the blue card as the default runtime card.

The previous blue card remains available only as an explicit fallback/comparison path through `useDragonGoldHomeCard = false`.

## Runtime default

File:

`apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`

Default:

```kotlin
useDragonGoldHomeCard: Boolean = true
```

Theme selection:

```kotlin
val cardTheme = if (useDragonGoldHomeCard) {
    CardVisualDefaults.HomeDashboardDragonGoldCandidate
} else {
    CardVisualDefaults.HomeDashboard
}
```

Because the real dashboard call does not pass this optional parameter, it now renders `CardVisualDefaults.HomeDashboardDragonGoldCandidate`.

## Naming cleanup

Updated the preview language so the old blue card is no longer called the default:

- `CardVisualHomeLegacyBluePreview`
- `MonthlyActivityCardDragonGoldDefaultPreview`

Updated `CardVisualDefaults.kt` comments:

- `DragonGoldPreview` is now described as legacy comparison: dragon artwork on the old blue surface.
- `HomeDashboardDragonGoldCandidate` is the runtime candidate name.
- `HomeDashboardDragonGoldTrial` remains only as a compatibility alias.

## Screenshot QA updates

Updated screenshot test naming:

- `home_card_legacy_blue_fallback_390.png`
- `home_card_dragon_gold_default_candidate_390.png`
- `home_card_dragon_gold_default_candidate_320.png`

The old blue card is still testable, but it is not treated as the default candidate anymore.

## What was not changed

- No backend code was touched.
- No navigation was changed.
- No dashboard text was changed.
- No displayed payment data was changed.
- No card-network logo was added.
- No real card number was added.
- Android payment/receiver logic was not changed.

## Verification

Passed:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon --max-workers=1 --no-watch-fs
```

Staging packaging passed with lintVital excluded after repeated Windows daemon crashes during lint:

```powershell
.\gradlew.bat :app:assembleStaging --no-daemon --max-workers=1 --no-watch-fs -x lintVitalAnalyzeStaging -x lintVitalReportStaging -x lintVitalStaging
```

Installed and launched on the ADB Wi-Fi device:

- Device: `SM_S916B`
- APK: `apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk`
- Install result: `Success`
- Launch result: `com.swimpay.receiver/.MainActivity`
- Device capture: `.swimpay-agent/screenshots/device_staging_dragongold_candidate.png`

Observed issue:

- Full `assembleStaging` without exclusions crashed twice with `Gradle build daemon disappeared unexpectedly`, once around `mergeDexStaging` and once during `lintVitalAnalyzeStaging`.
- The targeted screenshot test passed, and the APK packaging completed when skipping only lintVital.

## Candidate status

Status: candidate default stabilized for Home Dashboard visual runtime.

Remaining before release freeze:

- Run full staging build/lint on a machine/session with more stable native memory.
- Reinstall the final staging APK if runtime code changes again after this report.
- Do one final physical-device visual pass with font scaling and dark mode state checked.
