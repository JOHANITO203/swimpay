# Android Onboarding Account Polish - Agent B

## Scope

Design-only polish for Android Merchant onboarding/login/account entry.

Files touched:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt`
- `.swimpay-agent/ANDROID_ONBOARDING_ACCOUNT_POLISH_AGENT_B_REPORT.md`

No backend, API, payment runtime, webhook, receiver runtime or SDK files were changed.

## Changes

- Reused the real launcher icon resource for onboarding/account-entry badges and clipped it to the launcher-style rounded shape.
- Added an opaque premium background behind the clipped launcher image so translucent launcher pixels do not expose square artifacts.
- Replaced the account-entry welcome mark with the same launcher badge treatment used by onboarding chrome.
- Harmonized account/login choice cards with larger premium card radius, stable row minimum heights and cobalt/cyan icon tiles.
- Harmonized onboarding benefit cards with cobalt/cyan icon tiles, 48dp icon touch rhythm and consistent spacing.
- Removed the empty tap handler from static benefit cards so non-actions do not look interactive.

## Product Truth

- Existing copy and localization calls were preserved.
- No new feature, state, confirmation behavior or webhook behavior was added.
- Google remains recovery/login only where already present.
- Android remains capture/filter/redact/sign/upload only; backend remains the decision owner.

## Validation

- `git diff --check -- apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt` passed.
- `npm run android:assemble:staging` was attempted. It failed in the existing out-of-scope file `PremiumDashboardScreens.kt`:
  - line 1324: actual `StatusTone`, expected `PremiumTone`
  - line 1370: expected `StatusTone`, actual `PremiumTone`

Roborazzi was not run, per design-only active polish instruction.

## Risks

- The staging build cannot be proven green until the unrelated `PremiumDashboardScreens.kt` type mismatch is fixed by its owner.
- Visual confirmation on device/emulator is still recommended because this pass intentionally avoided golden/Roborazzi gates.
