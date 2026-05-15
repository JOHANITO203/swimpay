# Android UI Rollback To 7e95985 Report

Date: 2026-05-15

Target commit: `7e95985` - `Refactor code structure for improved readability and maintainability` from 2026-05-13 17:11:55 +0300.

## Scope

Restored the Android Merchant UI layer to the selected pre-later-design point.

Restored paths:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`
- Android premium UI-related tests selected from `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver`
- `apps/android-receiver/android/app/src/main/res`
- `design/ASSET_REGISTRY.md`

No backend, API, database, payment runtime, webhook runtime, receiver runtime or SDK behavior was intentionally changed by this rollback.

## Safety backup

Before rollback, created:

- Git branch: `backup-before-android-ui-rollback-20260515-030644`
- Patch backup: `.swimpay-agent/BACKUP_BEFORE_ANDROID_UI_ROLLBACK_20260515-030644.patch`

## Removed later design artifacts

These files were added after `7e95985` and were removed from the working tree:

- `PremiumIconography.kt`
- `PremiumMockupTokens.kt`
- `PremiumText.kt`
- `ic_payment_sbp_placeholder.xml`
- `AndroidPremiumTextIntegrityTest.kt`
- `AndroidRuntimeWiringGuardrailTest.kt`
- `PremiumDesignGuardrailsTest.kt`
- `PremiumReferencePngComparisonTest.kt`

## Validation

- `npm run android:assemble:staging` passed.
- Staging APK installed on device serial `R5CWA0FEPZW`.

## Notes

The rollback targets the operator-selected UI state only. Existing unrelated backend/session changes in `apps/api` remain untouched.
