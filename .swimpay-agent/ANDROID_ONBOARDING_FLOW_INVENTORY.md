# Android Onboarding Flow Inventory

Date: 2026-05-05

## Active Path

Active Android entry:

`MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`

Active visual source:

`apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`

No new active onboarding screens should be created under legacy/mock UI folders.

## Inventory Before Implementation

Before this onboarding pass, the active premium flow had a landing/onboarding mix inherited from the previous premium prototype:

1. Landing: reachable, but it was an extra screen before the approved onboarding welcome.
2. Welcome: reachable, but copy was not fully aligned with the approved confirmation wording.
3. Notification Access: reachable and opened Android Notification Listener settings, but needed approved copy and strict continuation behavior.
4. Bank sources: reachable, but the search and activation pattern needed to become the official merged search/results/selection step.
5. Business profile: reachable, not part of the approved onboarding.
6. Policy/confirmation: reachable, not part of the approved onboarding.
7. Ready to scan: reachable and marked onboarding complete, but skipped required receiving-method/site/configuration-test steps.

## Approved Target After Operator Correction

The operator requested merging compatible-bank search and bank selection to avoid redundant onboarding screens. The approved active onboarding sequence is now six screens:

1. Welcome
2. Notification Access
3. Compatible Bank Detection + Bank Selection
4. Receiving Method
5. Site or Application Connection
6. Configuration Test

The merged bank step must search only supported bank packages, show soft detection results, and let the merchant activate detected banks without requiring a second bank-selection screen.

## Bank Detection

The bank detection foundation uses `BankTargetLock`, `ExactPackageProbe`, and `PackageManagerExactPackageProbe`.

Allowed behavior:

- probe only exact supported package names;
- expose merchant-safe labels only: `Detectee`, `Non detectee`, `Activee`, `A configurer`;
- allow the merchant to activate detected banks;
- ignore unsupported packages.

Forbidden behavior:

- no `QUERY_ALL_PACKAGES`;
- no `getInstalledPackages` broad scan;
- no `getInstalledApplications` broad scan;
- no SMS;
- no Accessibility scraping;
- no notification processing during onboarding.

## Notification Access

Notification access is checked through `NotificationAccessStatusReader`. `MainActivity` refreshes the value on resume and passes it to `PremiumMerchantApp`.

The onboarding Notification Access step must:

- show the approved merchant copy;
- open Android Notification Listener settings;
- block continuation while access is disabled;
- refresh when the user returns to the app.

## Persistence

Onboarding completion is persisted through `SharedPreferencesPremiumOnboardingStateStore` under `swimpay_premium_onboarding/onboarding_completed`.

Intermediate onboarding choices are held in typed Compose state during this pass. The connected-site skipped state and configuration-test state are represented in the typed onboarding model and flow.

## Implementation Direction

Implement a six-step onboarding-only typed flow with merged compatible-bank detection/selection. Keep backend/payment/review/webhook behavior untouched. The connected-site step must be skippable and the configuration test must adapt to either `Site ou application connecte` or `Site ou application a configurer`.
