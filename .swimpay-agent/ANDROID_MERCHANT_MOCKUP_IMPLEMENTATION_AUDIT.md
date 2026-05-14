# Android Merchant Mockup Implementation Audit

Date: 2026-05-13
Scope: Android Merchant premium UI visual sprint, audit-before-implementation gate

## Audit Result

Gate: `GO_WITH_BLOCKERS`

The reference pack exists under `design/reference/android-merchant/` with all 14 requested PNG files. The Android app already has a premium Compose surface, runtime-backed merchant repositories, registered bank assets, and Roborazzi wiring. The current UI is a premium foundation, but it is not yet a one-to-one implementation of the 14 reference screens: existing goldens are older premium baselines and are not named or composed as the requested screen matrix.

## Mandatory Context Read

- `AGENTS.md`
- `docs/02_SYSTEM_ARCHITECTURE.md`
- `docs/11_SECURITY_AND_PRIVACY.md`
- `docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`
- `design/ASSET_REGISTRY.md`
- `tasks/143_bank_selection_onboarding_ui_debug.md`

No database, matching, or payment-decision files are in scope for this visual sprint.

## Active Compose Entrypoints

- App entry: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt`
- Runtime router: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- Account/login: `PremiumAccountEntryScreens.kt`
- Onboarding: `PremiumOnboardingScreens.kt`
- Dashboard/settings/integration/receiver/security: `PremiumDashboardScreens.kt`
- Review queue/detail: `PremiumReviewScreens.kt`
- Runtime state/repositories: `PremiumMerchantRuntime.kt`
- Navigation: `PremiumNavigationState.kt`

## Existing Tokens And Components

Detected:

- `PremiumColors`
- `PremiumRadius`
- `PremiumSpacing`
- `PremiumType`
- `PremiumElevation`
- `PremiumIconSize`
- `PremiumComponentSize`
- `PremiumToneColors`
- `PremiumBrandGradient`
- `PremiumAppShell`
- `PremiumBottomNav`
- `PremiumCard`
- `PremiumGradientPanel`
- `PremiumPrimaryButton`
- `PremiumOutlineButton`
- `StatusChip`
- `PremiumBankLogo`

Gaps:

- Tokens exist, but visual values are not yet aligned to the dark fintech reference pack.
- The reference bottom navigation has five operational tabs; current runtime shell has four (`Home`, `Reviews`, `Orders`, `Menu`) plus routed subscreens.
- Several component names differ from the sprint target names, so reports should map current names rather than invent new wrappers unless they remove duplication.

## Existing Roborazzi Setup

Command wiring exists in root `package.json`:

- `npm run android:screenshot:record`
- `npm run android:screenshot:verify`

Screenshot test file:

- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/PremiumGoldenScreenshotTest.kt`

Existing snapshots:

- `premium_account_entry.png`
- `premium_onboarding_landing.png`
- `premium_dashboard.png`
- `premium_review_list.png`
- `premium_review_detail.png`
- `premium_receiving_methods.png`
- `premium_developer_integration.png`
- `premium_receiver_health.png`
- `premium_security.png`
- plus older support/settings/order baselines.

Gap: no explicit 14-reference matrix yet for `01_login_welcome` through `14_security_settings`.

## Asset Registry And Bank Logos

Registered bank/runtime assets:

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_sberbank.png`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_tbank.png`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_vtb.png`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_alfa.png`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_gazprombank.png`
- `apps/android-receiver/android/app/src/main/res/drawable/ic_bank_ozon.xml`

No new asset is required for the first implementation pass. The compact SwimPay mark is currently a token-driven Compose mark documented in `design/ASSET_REGISTRY.md`.

## Permission And Runtime Safety Audit

Manifest check:

- No `QUERY_ALL_PACKAGES`
- No `READ_SMS`
- No Accessibility service
- Notification listener service exists and remains the intended receiver boundary.
- Exact bank package visibility uses `<queries>` entries, not broad package enumeration.

Runtime data check:

- `PremiumMerchantRuntime` uses repositories for dashboard, review, receiving methods, receiver health, connected site, configuration, and review actions.
- Preview/demo constructors exist and are acceptable only for previews/golden tests.
- Visual sprint must not route runtime failures to fake operational metrics.

## Screen Classification

| Ref | Screen | Current route/component | Classification |
| --- | --- | --- | --- |
| 01 | Login / Welcome | `PremiumAccountEntryScreen` | `partial`, `needs_screenshot_baseline` |
| 02 | Notification access | `PremiumOnboardingFlow` step 2 | `partial`, `copy_conflict_with_product_truth`, `needs_screenshot_baseline` |
| 03 | Bank selection | `PremiumOnboardingFlow` step 3 | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 04 | Receiving setup | `PremiumOnboardingFlow` step 4 | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 05 | Site / App setup | `PremiumOnboardingFlow` step 5 | `partial`, `copy_conflict_with_product_truth`, `needs_screenshot_baseline` |
| 06 | Webhook test | `PremiumOnboardingFlow` step 6 / configuration test state | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 07 | Dashboard home | `PremiumDashboardScreen` | `visually_wrong`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 08 | Review queue | `PremiumReviewsScreen` | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 09 | Review detail | `PremiumPaymentDetailScreen` | `partial`, `copy_conflict_with_product_truth`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 10 | Receiving methods | `PremiumReceivingMethodsStateScreen` | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 11 | Integrations list | `PremiumSettingsScreen` summary + `PremiumConnectedSiteSummary` | `missing` as standalone list, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 12 | Integration detail | `PremiumConnectedSiteStateScreen` | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 13 | Receiver health | `PremiumReceiverHealthStateScreen` | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |
| 14 | Security & settings | `PremiumSecurityScreen` plus settings menu | `partial`, `data_contract_sensitive`, `needs_screenshot_baseline` |

## Product Copy Findings

Must fix or guard:

- Runtime UI must not expose `notification brute`; review detail currently contains a replacement helper, but tests should assert the visible label is `Extrait d'audit redacted` or equivalent safe copy.
- Notification access copy must avoid absolute privacy claims such as `Aucune donnée bancaire n'est transmise` or `données restent sur votre appareil` when redacted metadata may be uploaded.
- Site/app and integration copy must not imply Android sends webhooks or confirms fulfillment.
- Existing positive use of `SwimPay n'est pas une banque...` is allowed as a disclaimer, but tests should target false claims that SwimPay provides official confirmation.

## Audit Conclusion

Implementation may proceed after this report. The sprint must remain UI-only, preserve backend/runtime contracts, add failing static/golden tests first, and document visual gaps instead of claiming pixel-perfect without evidence.
