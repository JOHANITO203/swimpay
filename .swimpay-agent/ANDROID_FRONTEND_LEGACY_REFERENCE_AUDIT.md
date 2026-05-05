# Android Frontend Legacy Reference Audit

generated_at: 2026-05-05T00:00:00+03:00

## Scope

Searched Android source, tests, Gradle files, manifest, docs, tasks and agent reports for:

- `ui/screens`
- `ui.screens`
- `AndroidMerchantScreenRenderer`
- `AndroidMerchantViewComponents`
- `AndroidMerchantVisualDesign`

## Active UI Path

The active Android merchant UI path is:

`MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`

The active visual source is:

`apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`

## Reference Findings

### `ui/screens/*`

Files found:

- `ui/screens/BankChannelsScreen.kt`
- `ui/screens/ConditionsScreen.kt`
- `ui/screens/DashboardScreen.kt`
- `ui/screens/ExactMerchantMockScreens.kt`
- `ui/screens/LandingScreen.kt`
- `ui/screens/OnboardingScreen.kt`
- `ui/screens/OrdersScreen.kt`
- `ui/screens/PhoneSettingsScreen.kt`
- `ui/screens/ReviewScreen.kt`
- `ui/screens/SecurityCenterScreen.kt`
- `ui/screens/SettingsScreen.kt`
- `ui/screens/SupportScreen.kt`
- `ui/screens/SyncEngineScreen.kt`

Status:

- Dead visual source.
- No active import from `MainActivity`.
- No active import from `PremiumMerchantApp`.
- No Gradle or manifest reference.

Action:

- Safe purge candidate after tests are updated.

### `AndroidMerchantScreenRenderer.kt`

Status:

- Legacy renderer.
- References `AndroidMerchantViewComponents`.
- Not referenced by active app.

Action:

- Delete after replacing old visual architecture assertions.

### `AndroidMerchantViewComponents.kt`

Status:

- Legacy Android View helper.
- Referenced only by `AndroidMerchantScreenRenderer`.
- Not referenced by active app.

Action:

- Delete with `AndroidMerchantScreenRenderer`.

### `AndroidMerchantVisualDesign.kt`

Status:

- Legacy visual tokens/model.
- Referenced by the existing `AndroidMerchantVisualArchitectureTest`.
- Not referenced by active app.

Action:

- Replace test coverage with premium-source assertions, then delete.

## Files Preserved

The following files are not legacy visual files and must stay:

- `MainActivity.kt`
- `PremiumMerchantApp.kt`
- `PremiumMerchantRuntime.kt`
- `AndroidMerchantApiWiring.kt`
- `AndroidMerchantUiModels.kt`
- `NotificationAccessStatusReader.kt`
- `ReceiverOnboardingReadiness.kt`
- `AndroidManifest.xml`

## Safety Decision

Proceed to purge only after replacing `AndroidMerchantVisualArchitectureTest` so it asserts:

- premium source of truth;
- no legacy visual files;
- merchant-safe wording;
- review action separation;
- no raw PII;
- no direct Android webhook delivery;
- no official bank confirmation claim.
