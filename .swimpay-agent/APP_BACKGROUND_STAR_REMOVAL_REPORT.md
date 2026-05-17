# App Background Star Removal Report

## Scope

- Removed the unwanted star in the bottom-right corner of the Ryujin/Tsukuyomi background asset.
- No Kotlin behavior, navigation, backend, payment runtime, or copy changes.

## File Modified

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/app_bg_ryujin_tsukuyomi_overlay.png`

## Method

- The star was isolated as a bright connected component in the lower-right transparent corner.
- Only that connected component was changed.
- The removed pixels were set to transparent so the existing app background base shows through.
- This avoids repainting the image and preserves the dragon/cloud artwork.

## Control Files

- Backup before edit: `.swimpay-agent/assets/app_bg_ryujin_tsukuyomi_overlay_before_star_removal.png`
- Transparent crop check: `.swimpay-agent/assets/app_bg_star_removed_crop.png`
- Composited crop check: `.swimpay-agent/assets/app_bg_star_removed_composited_crop.png`

## Verification

- `.\gradlew.bat :app:assembleStaging --no-daemon --max-workers=1 --no-watch-fs -x lintVitalAnalyzeStaging -x lintVitalReportStaging -x lintVitalStaging` passed.
- Staging APK installed on the connected `SM_S916B` device and app relaunched.
