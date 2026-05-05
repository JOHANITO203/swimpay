# Task 414 — Android Frontend Legacy Purge

Sprint: 7J — Android Frontend Source-of-truth Cleanup

Goal:

Delete confirmed-dead Android merchant visual legacy files so `ui/premium` becomes the only active visual source of truth.

Candidate low-risk purge:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens/*`

Candidate medium-risk purge after test replacement:

- `AndroidMerchantScreenRenderer.kt`
- `AndroidMerchantViewComponents.kt`
- `AndroidMerchantVisualDesign.kt`

Rules:

- Delete only confirmed-dead legacy visual files.
- Do not delete runtime/API/contract files.
- Do not delete tests that provide safety coverage; replace legacy assertions first.
- Do not reintroduce deleted legacy UI.
- Do not change backend, APIs, contracts, payment logic, review logic or notification processing.

Validation:

- Run Android debug unit tests.
- Run Android debug APK build.
