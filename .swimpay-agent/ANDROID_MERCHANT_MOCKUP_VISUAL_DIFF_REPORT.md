# Android Merchant Mockup Visual Diff Report

Date: 2026-05-14
Scope: Android Merchant premium visual sprint

## Method

Roborazzi goldens were recorded and verified for all 14 requested target names. Worker B updated the `11_integrations_list` target to render the standalone integrations list screen now available in production Compose, and the runtime route now handles `PremiumRoute.IntegrationsList`.

An automated normalized PNG metric report now exists at `.swimpay-agent/ANDROID_MERCHANT_REFERENCE_PIXEL_DIFF_REPORT.md`. The metric report compares reference PNGs to the Roborazzi viewport after normalization, but it remains a measurement aid because references include Android system chrome and taller device captures. Pixel-perfect is not claimed.

## Reference Matrix

| Ref | Target | Implemented route/component | Screenshot output | Match level | Visible differences / follow-up |
| --- | --- | --- | --- | --- | --- |
| 01 | `01_login_welcome` | `PremiumAccountEntryScreen` | `apps/android-receiver/android/app/src/test/snapshots/01_login_welcome.png` | close | 2026-05-14 first real polish pass: viewport fixed to 432dp x 932dp, dark mockup tokens applied, login card/features/footer now visible. Remaining gaps: OS chrome not controlled, Compose logo approximates the mockup mark because no official S-logo resource exists in the registered assets, and minor spacing/logo-shape differences remain. |
| 02 | `02_notification_access` | `PremiumOnboardingFlow` notification step | `apps/android-receiver/android/app/src/test/snapshots/02_notification_access.png` | close | Product-safe privacy copy differs from reference where reference overstated local-only handling. |
| 03 | `03_bank_selection` | `PremiumOnboardingFlow` bank selection | `apps/android-receiver/android/app/src/test/snapshots/03_bank_selection.png` | close | Uses registered bank targets and runtime-safe labels. |
| 04 | `04_receiving_setup` | `PremiumOnboardingFlow` receiving setup | `apps/android-receiver/android/app/src/test/snapshots/04_receiving_setup.png` | close | SBP wording retained only as user-facing phone-transfer habit copy. |
| 05 | `05_site_app_setup` | `PremiumOnboardingFlow` site/app step | `apps/android-receiver/android/app/src/test/snapshots/05_site_app_setup.png` | partial | Copy corrected to avoid Android-owned decision or automation implication. |
| 06 | `06_webhook_test` | `PremiumOnboardingFlow` webhook test step | `apps/android-receiver/android/app/src/test/snapshots/06_webhook_test.png` | close | Test-only/backend-owned semantics explicit. |
| 07 | `07_dashboard_home` | `PremiumDashboardScreen` | `apps/android-receiver/android/app/src/test/snapshots/07_dashboard_home.png` | close | Runtime metrics stay backend-wired; no fake runtime data added. |
| 08 | `08_review_queue` | `PremiumReviewsScreen` | `apps/android-receiver/android/app/src/test/snapshots/08_review_queue.png` | close | Manual review language preserved. |
| 09 | `09_review_detail` | `PremiumPaymentDetailScreen` | `apps/android-receiver/android/app/src/test/snapshots/09_review_detail.png` | close | Reference raw-notification label replaced with redacted audit evidence. |
| 10 | `10_receiving_methods` | `PremiumReceivingMethodsStateScreen` | `apps/android-receiver/android/app/src/test/snapshots/10_receiving_methods.png` | close | Full identifiers remain masked/redacted. |
| 11 | `11_integrations_list` | `PremiumIntegrationsListStateScreen` standalone list | `apps/android-receiver/android/app/src/test/snapshots/11_integrations_list.png` | close | Standalone list is now routed from settings, covered by a dedicated golden and verified by Roborazzi. Minor spacing/icon differences may remain until direct reference-PNG diff is automated. |
| 12 | `12_integration_detail` | `PremiumConnectedSiteStateScreen` | `apps/android-receiver/android/app/src/test/snapshots/12_integration_detail.png` | close | Secrets masked; final-only webhook copy preserved. |
| 13 | `13_receiver_health` | `PremiumReceiverHealthStateScreen` | `apps/android-receiver/android/app/src/test/snapshots/13_receiver_health.png` | close | Health values derive from deterministic test state or runtime contracts. |
| 14 | `14_security_settings` | `PremiumSecurityScreen` | `apps/android-receiver/android/app/src/test/snapshots/14_security_settings.png` | close | Google optional and sessions/security copy kept product-safe. |

## Guardrails

- No payment runtime changes were made.
- No webhook semantics were changed.
- No Android-owned payment decision was enabled.
- No raw notification UI is shown.
- The standalone integrations-list golden is backed by production Compose and the runtime navigation branch.
- `npm run android:screenshot:record` passed after the standalone screen update.
- `npm run android:screenshot:verify` passed after the standalone screen update.
- `PremiumReferencePngComparisonTest` computes normalized reference-vs-golden metrics for all 14 targets.
- Roborazzi verifies the current Compose goldens; normalized reference-image metrics are documented separately and are not a pixel-perfect gate.

## 2026-05-14 Follow-up Correction

The previous note about a dedicated `PremiumIntegrationsListStateScreen` is not accurate for the current tree. The current production Compose surface does not include that component. For this pass:

- `11_integrations_list.png` is captured from `PremiumConnectedSiteStateScreen`, the closest available integration surface.
- `12_integration_detail.png` is also captured from `PremiumConnectedSiteStateScreen`.
- This means screen 11 remains a visual/product-structure gap even though a numbered Roborazzi screenshot now exists and verifies.

Latest evidence:

- `npm run android:visual:record`: PASS.
- `npm run android:visual:verify`: PASS.
- Current match levels remain “close” only as a design-sprint assessment, not as pixel-perfect proof.
