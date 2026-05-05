# Next Action

generated_at: 2026-05-04T23:58:46+03:00

## Latest Sprint 7J Cleanup

Android frontend source-of-truth cleanup is complete pending final validation/commit.

Completed:

1. Created Sprint 7J tasks 413 through 416.
2. Updated `.swimpay-agent/TASK_QUEUE.md`.
3. Created `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`.
4. Deleted confirmed-dead legacy visual files under `ui/screens/*`.
5. Deleted legacy visual renderer/model files:
   - `AndroidMerchantScreenRenderer.kt`
   - `AndroidMerchantViewComponents.kt`
   - `AndroidMerchantVisualDesign.kt`
6. Replaced legacy visual architecture assertions with premium-source assertions.
7. Created `.swimpay-agent/ANDROID_FRONTEND_SOURCE_OF_TRUTH_REPORT.md`.

Next recommended action:

Run Sprint 7K — Android Premium Navigation and State Foundation.

Do not do:

- Do not reintroduce `ui/screens/*`.
- Do not bypass `PremiumMerchantRuntime`.
- Do not delete `AndroidMerchantApiWiring.kt` or `AndroidMerchantUiModels.kt`.
- Do not change backend APIs, payment logic, notification processing or auto-confirmation during frontend navigation work.

## Latest Android Frontend Planning

Multi-agent Android frontend audit completed.

Created:

- `.swimpay-agent/ANDROID_FRONTEND_SUBSCREENS_MULTI_AGENT_REPORT.md`

Findings:

1. The active Android merchant frontend source of truth is `ui/premium`, mounted through `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
2. Legacy/mock frontend files under `ui/screens/*` are not referenced by the active app and are candidates for deletion after build/test.
3. `AndroidMerchantApiWiring.kt`, `AndroidMerchantUiModels.kt`, `PremiumMerchantRuntime.kt`, `MainActivity.kt`, manifest guardrails and Android tests must be preserved.
4. The next safe frontend wave should be split into sprints:
   - Sprint 7J: source-of-truth cleanup and legacy purge.
   - Sprint 7K: typed navigation and reusable state components.
   - Sprint 7L: onboarding and dashboard completion.
   - Sprint 7M: receiving methods and bank management.
   - Sprint 7N: reviews and orders.
   - Sprint 7O: connected site, receiver health and configuration test.
   - Sprint 7P: real-device visual QA and responsive hardening.

Recommended next action:

Start Sprint 7J before continuing real-notification shadow testing.

Do not do:

- Do not delete `AndroidMerchantApiWiring.kt`.
- Do not delete `AndroidMerchantUiModels.kt`.
- Do not bypass `PremiumMerchantRuntime`.
- Do not change backend APIs, payment logic, notification processing or auto-confirmation.
- Do not capture real bank notifications during frontend cleanup.

## Latest Android Onboarding Fix

Android premium onboarding now uses real Notification Listener Access state and persists onboarding completion.

Completed:

1. Added a persisted premium onboarding completion store.
2. Completed onboarding now starts future app launches at the merchant dashboard instead of relaunching onboarding.
3. The authorization step now opens Android Notification Listener settings when access is disabled.
4. The authorization step only continues when Notification Listener Access is enabled.
5. Removed unsafe `Policy Engine` / `AI (EXPERT)` / payment automation wording from onboarding.
6. Added Android JVM/static tests for this behavior.

Current blocker:

- ADB currently lists no connected devices, so the rebuilt APK could not be installed/launched in this pass.

Next recommended action:

Reconnect or re-authorize the phone for ADB, then install and launch the existing debug APK without clearing app data.

## Latest Sprint 7I Attempt

Sprint 7I Sberbank real-notification shadow test is preflighted, but live capture has not started.

Completed:

1. Created Sprint 7I task files 407 through 412.
2. Updated `.swimpay-agent/TASK_QUEUE.md`.
3. Created `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md`.
4. Ran Docker/API/Node/Android validation.
5. Verified backend health after starting Docker Desktop.
6. Verified ADB device, reverse, APK install and app launch.
7. Verified Notification Listener Access includes SwimPay.
8. Verified exact Sberbank package `ru.sberbankmobile` exists on device.
9. Verified Sberbank backend state safely without exposing certificate hashes.
10. Created `.swimpay-agent/SPRINT_7I_SBERBANK_SHADOW_REPORT.md`.

Blocked:

1. Explicit live-capture consent phrase is still required.

## Next Recommended Action

Continue Sprint 7I only after the operator explicitly confirms:

`I consent to one controlled Sberbank real-notification shadow test now.`

Then run exactly one controlled Sberbank notification shadow capture, redacted and review-first.

## Do Not Do

- Do not capture real bank notifications without explicit consent.
- Do not process non-Sberbank notifications.
- Do not enable auto-confirmation.
- Do not enable raw notification storage.
- Do not change production trust.
- Do not read SMS.
- Do not scrape bank apps.
- Do not use Accessibility scraping.
- Do not claim official bank confirmation.

## Latest Frontend Work

Frontend browser/device visual QA pass is complete.

Completed:

1. Rebuilt the web frontend.
2. Added a local browser-QA mock server for frontend-only screenshot capture.
3. Captured merchant and buyer checkout screens across mobile-equivalent, mobile-large, tablet and desktop viewports.
4. Fixed visual-only responsive issues:
   - right-side clipping on small screens;
   - overly wide titles/brand rows;
   - non-shrinking cards/flex rows;
   - checkout instruction rows and copy actions;
   - QR handoff visual strength.
5. Created `.swimpay-agent/FRONTEND_BROWSER_QA_REPORT.md`.
6. Kept backend APIs, contracts, workers, payment logic, database, Android notification processing, webhooks and auto-confirmation unchanged.

## Next Recommended Action

Run a final real-device/browser visual review from the user-facing app shell, then continue with focused UI polish only where screenshots or device usage show concrete friction.

## Do Not Do

- Do not change checkout APIs or contracts during visual polish.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card/phone or raw notification text.
- Do not claim official bank confirmation.

---

## Latest Android Frontend Cleanup

Sprint 7J Android frontend source-of-truth cleanup is complete.

Completed:

1. Created tasks 413 through 416 and updated the task queue.
2. Created `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`.
3. Deleted confirmed-dead legacy Android visual files under `ui/screens`.
4. Deleted old mock visual files:
   - `AndroidMerchantScreenRenderer.kt`;
   - `AndroidMerchantViewComponents.kt`;
   - `AndroidMerchantVisualDesign.kt`.
5. Replaced legacy visual tests with premium source-of-truth tests.
6. Created `.swimpay-agent/ANDROID_FRONTEND_SOURCE_OF_TRUTH_REPORT.md`.
7. Installed and launched the debug APK on the connected Samsung device.

## Next Recommended Action

Run Sprint 7K: Android Premium Navigation and State Foundation.

Recommended scope:

- typed premium route tree;
- typed bottom-tab model;
- reusable loading/empty/error/action-required states;
- sub-screen navigation for receiving methods, banks, orders, connected site, receiver health and configuration test;
- no backend/API/payment behavior changes.

## Do Not Do

- Do not reintroduce `ui/screens` as a visual source.
- Do not delete runtime/API/model/notification guardrail files.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw PII.

---

## Latest Android Premium Navigation Work

Sprint 7K Android premium navigation/state foundation is complete and validated.

Completed:

1. Created tasks 417 through 422 and updated the task queue.
2. Added typed premium routes and typed premium bottom tabs.
3. Replaced raw route string and raw tab integer navigation in `PremiumMerchantApp`.
4. Added `PremiumScreenState` for loading, empty, action-required, error, offline and content states.
5. Added `PremiumStatePanel` as a reusable state component.
6. Added typed destination placeholders for future sub-screens.
7. Added Android JVM tests for routes, tabs, safe state copy and premium architecture.
8. Validated root checks, Android JVM tests, Android debug APK build, Docker Compose health and API health.
9. Installed and launched the debug APK on the connected Samsung device; UIAutomator showed the premium shell and typed bottom navigation.

## Next Recommended Action

Run Sprint 7L: Android Premium Screen State Rollout.

Recommended scope:

- dashboard loading/empty/error/action-required;
- review queue empty/error/action-required;
- payment detail missing/error state;
- orders empty/error state;
- menu sub-screen links wired to full premium screens.

## Do Not Do

- Do not change backend/API/payment/review behavior during state rollout.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card, raw phone, raw notification text or webhook secrets.

---

## Latest Frontend Work

Buyer checkout UX realignment is complete.

Completed:

1. Created tasks 399 through 406 and updated the task queue.
2. Created `.swimpay-agent/BUYER_CHECKOUT_SCREEN_INVENTORY.md`.
3. Created `.swimpay-agent/BUYER_CHECKOUT_UX_REPORT.md`.
4. Reworked hosted checkout into staged buyer screens:
   - Pay with SwimPay intro;
   - bank-first selection;
   - payment method reveal;
   - payer launcher;
   - card/phone instructions;
   - buyer-safe checkout states;
   - desktop QR handoff.
5. Added tests for bank-step privacy, card/phone masking, buyer status panels and safe wording.
6. Kept backend APIs, contracts, workers, payment decisions, webhooks, database and Android notification processing unchanged.

## Next Recommended Action

Run browser screenshot QA for `/checkout/:paymentSessionId` across:

1. small mobile viewport;
2. large mobile viewport;
3. tablet;
4. desktop.

Then do a small visual-only spacing/QR polish pass if screenshots reveal layout issues.

## Do Not Do

- Do not change checkout APIs or contracts during visual QA.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card/phone or raw notification text.
- Do not claim official bank confirmation.
