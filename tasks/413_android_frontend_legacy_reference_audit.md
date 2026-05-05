# Task 413 — Android Frontend Legacy Reference Audit

Sprint: 7J — Android Frontend Source-of-truth Cleanup

Goal:

Audit all references to legacy Android merchant frontend files before deleting anything.

Scope:

- Android source
- Android tests
- Gradle files
- Android manifest
- docs and agent reports

Search targets:

- `ui/screens`
- `ui.screens`
- `AndroidMerchantScreenRenderer`
- `AndroidMerchantViewComponents`
- `AndroidMerchantVisualDesign`

Rules:

- Do not delete files in this task.
- Do not change backend APIs.
- Do not change contracts.
- Do not change payment, review, notification, auto-confirmation or security logic.
- Preserve high-risk files:
  - `MainActivity.kt`
  - `PremiumMerchantApp.kt`
  - `PremiumMerchantRuntime.kt`
  - `AndroidMerchantApiWiring.kt`
  - `AndroidMerchantUiModels.kt`
  - `NotificationAccessStatusReader.kt`
  - `ReceiverOnboardingReadiness.kt`
  - `AndroidManifest.xml`

Deliverable:

- `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`
