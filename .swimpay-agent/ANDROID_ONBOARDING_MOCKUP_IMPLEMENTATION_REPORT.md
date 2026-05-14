# Android Onboarding Mockup Implementation Report

Date: 2026-05-13
Agent: Agent 4, Onboarding Agent
Scope: Android Merchant onboarding/login visual sprint, reference screens 01-06

## Files changed

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumOnboardingFullFlowTest.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`

`PremiumComponents.kt` was touched only to repair a shared compile blocker in `PremiumStatePanel`: the existing positional `PremiumOutlineButton` call no longer matched the current button signature. No dashboard, review, integration or runtime decision behavior was changed by this agent.

## What changed

- Added product-copy guardrail coverage for notification access and webhook-test semantics.
- Aligned onboarding copy with the current Android account truth:
  - Android notification access is broad, while SwimPay filters locally to compatible bank notifications.
  - No SMS reading, bank scraping or raw text upload is promised or introduced.
  - Receiving setup keeps raw identifiers temporary and backend-owned for masking/storage policy.
  - Site/app setup says webhooks happen after merchant manual validation.
  - Webhook test is backend-owned, test-only and never sent directly by Android.
- Refined visuals for screens 02-06:
  - numbered `x / 6` step pill;
  - step progress markers with completed/current states;
  - bank rows now use registered bank logos instead of text initials;
  - receiving-method cards use card/phone transfer terminology with SBP as copy-only context;
  - CTA hierarchy and safe explanatory copy better match the reference flow.
- Preserved runtime flow:
  - `Configurer plus tard` still completes onboarding without running the webhook test.
  - `Ajouter maintenant` still routes to the backend-owned webhook test path.
  - Android still never confirms payments or sends fulfillment webhooks.

## Verification

- Attempted targeted red/green command:
  - `./gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.PremiumOnboardingFullFlowTest --no-daemon --stacktrace --max-workers=1`
- First run failed before tests because of a pre-existing compile blocker in `PremiumAccountEntryScreens.kt`: `PremiumPrimaryButton` was called with unsupported `trailingIcon`.
- After fixing that, the next compile blocker was the shared `PremiumComponents.kt` `PremiumOutlineButton` call mismatch; fixed as a minimal shared unblock.
- Subsequent Gradle runs could not start the JVM because Windows reported insufficient page-file/native memory (`DOS error/errno=1455`, failed metaspace/native allocation). Tests did not execute to completion on this host.
- Static guardrail scans were run with `rg`:
  - required safe onboarding/webhook copy is present;
  - forbidden unsafe onboarding phrases are absent from `PremiumOnboardingScreens.kt`.

## Guardrail result

- No official bank confirmation claim added.
- No auto-confirmation wording added.
- No raw notification text collection added.
- No SMS/accessibility/bank-app scraping behavior added.
- Webhook test remains backend-owned and test-only.
