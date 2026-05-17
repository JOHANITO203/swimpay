# App Dark Card Artwork Report

## Scope

- Added the first dark-theme Home Dashboard card candidate.
- The card now changes visual theme based on the selected app theme.
- No backend, navigation, payment runtime, review logic, or copy changes.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_artwork_dark_oni_yatagarasu.png`

## Asset

- Source: `C:\Users\Lenovo\Downloads\oni_yatagarasu_artwork_transparent_1586x1000.png`
- Runtime resource: `card_artwork_dark_oni_yatagarasu.png`
- Dimensions: `1586 x 1000`
- Format: PNG RGBA with transparency.

## Theme Routing

`MonthlyActivityCard` now selects:

- dark app theme: `CardVisualDefaults.HomeDashboardDark`
- light app theme default: `CardVisualDefaults.HomeDashboardDragonGoldMaterial`
- explicit light fallback: `CardVisualDefaults.HomeDashboard`

## Dark Card Candidate

- Surface:
  - deep graphite/night gradient
  - black brushed metal texture
  - subtle moon-blue edge
- Artwork:
  - `card_artwork_dark_oni_yatagarasu`
  - alpha `0.74f`
  - scale `1.03f`
- Effects:
  - reflection enabled as a diagonal moon-blue material sheen

## Material Polish Pass

- Reused the same brushed black metal texture as the light/DragonGold card.
- Increased dark card texture alpha from `0.20f` to `0.24f`.
- Increased artwork alpha from `0.74f` to `0.80f`.
- Shifted the edge from subtle blue to moon-cyan and raised alpha to `0.24f`.
- Replaced the uniform reflection overlay with a diagonal white-to-transparent-to-moon-blue sheen.

## Preview

- Added `MonthlyActivityCardDarkOniYatagarasuPreview`.

## Verification

- `.\gradlew.bat :app:compileStagingKotlin --no-daemon --max-workers=1 --no-watch-fs` passed.
- `.\gradlew.bat :app:assembleStaging --no-daemon --max-workers=1 --no-watch-fs -x lintVitalAnalyzeStaging -x lintVitalReportStaging -x lintVitalStaging` passed.
- Staging APK installed on the connected `SM_S916B` device and app relaunched.
