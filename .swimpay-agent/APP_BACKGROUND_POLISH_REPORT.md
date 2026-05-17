# App Background Polish Report

## Scope

- Polish pass for the validated Ryujin/Tsukuyomi light theme background.
- No backend, navigation, payment runtime, review logic, or copy changes.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`

## Layer Model

The current light theme background now has:

- Base color: `PremiumColors.Background`
- Base illustration: `app_bg_ryujin_tsukuyomi_overlay.png`
- Natural light layer: moon and cloud sources
- Dragon rim light layer: subtle light on selected dragon body/head zones
- Soft contrast layer: subtle darkening for component readability

## New Flags

- `useDragonRimLightLayer = true`
- `useSoftContrastLayer = true`

## Natural Light Polish

- Moon halo strengthened with cold white/blue tones:
  - center `x = 0.31`, `y = 0.66`
  - radius `0.58 * minDimension`
- Cloud halo refined:
  - center `x = 0.88`, `y = 0.40`
  - radius `0.46 * minDimension`

## Dragon Rim Light

- Central body highlight:
  - center `x = 0.60`, `y = 0.32`
  - radius `0.30 * minDimension`
- Lower head/body highlight:
  - center `x = 0.50`, `y = 0.73`
  - radius `0.34 * minDimension`

## Soft Contrast

- Adds a very soft vertical scrim:
  - slight top contrast
  - transparent middle
  - stronger lower contrast for bottom navigation
- Adds a subtle top-center contrast radial for text-heavy areas.

## Verification

- `.\gradlew.bat :app:compileStagingKotlin --no-daemon --max-workers=1 --no-watch-fs` passed.
- `.\gradlew.bat :app:assembleStaging --no-daemon --max-workers=1 --no-watch-fs -x lintVitalAnalyzeStaging -x lintVitalReportStaging -x lintVitalStaging` passed.
- Staging APK installed on the connected `SM_S916B` device and app relaunched.
