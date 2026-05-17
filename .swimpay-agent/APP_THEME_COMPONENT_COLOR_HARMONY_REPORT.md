# App Theme Component Color Harmony Report

## Scope

- Harmonized the premium light/blue component tokens with the validated Ryujin/Tsukuyomi background.
- Kept backend, navigation, payment runtime, review logic, and copy untouched.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDesignTokens.kt`

## Design Direction

- Remove electric-blue UI residue from the light theme.
- Keep the deep nocturne base.
- Shift accents toward moonlit cyan, blue-grey, and cold mist.
- Use graphite/indigo translucent surfaces so components sit on the illustration instead of fighting it.

## Token Changes

- `Blue`: electric `#003BFF` -> moon blue `#6EA8C8`
- `ElectricBlue`: saturated `#4E86FF` -> pale moon cyan `#A7D8F2`
- `Cyan`: bright `#4DDBFF` -> soft highlight `#B9ECFF`
- `Teal`: electric blue reuse -> natural blue-cyan `#78BFD8`
- `Surface`: opaque navy -> graphite translucent `#E60A1828`
- `SurfaceAlt`: saturated panel -> smoky indigo `#CC102A42`
- `Line`: hard blue border -> soft translucent moon border `#4D8FC9E8`
- `Muted` / `SoftText`: adjusted toward cooler readable blue-grey.
- Primary gradients shifted away from electric blue.

## Expected Visual Impact

- Cards should feel embedded in the background.
- Icons/chips should read as moonlit UI accents instead of neon controls.
- Text contrast remains high because `Ink` stays near white.
- The DragonGold card is not directly changed by this token pass.

## Risks To Check On Device

- Semi-transparent cards may reveal too much illustration under dense text.
- Disabled/secondary labels may need a small brightness bump on screens with heavy artwork behind them.
- Warning/danger tones are cooler now; verify that action hierarchy still reads correctly.

## Verification

- `.\gradlew.bat :app:compileStagingKotlin --no-daemon --max-workers=1 --no-watch-fs` passed.
- `.\gradlew.bat :app:assembleStaging --no-daemon --max-workers=1 --no-watch-fs -x lintVitalAnalyzeStaging -x lintVitalReportStaging -x lintVitalStaging` passed.
- Staging APK installed on the connected `SM_S916B` device and app relaunched.
