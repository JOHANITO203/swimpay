# Android Frontend Sub-screens Multi-agent Report

generated_at: 2026-05-05T00:00:00+03:00

## Mission

Audit the Android merchant frontend, identify the current source of truth, isolate legacy/mock UI that can be removed safely, and propose grouped implementation sprints for sub-screens and state coverage.

No backend, API, payment logic, notification processing, production trust or auto-confirmation behavior was changed.

## Executive Decision

The new source of truth should be:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`
- `PremiumMerchantApp`
- `PremiumMerchantRuntime`
- `AndroidMerchantApiWiring`
- `AndroidMerchantUiModels` as a contract/guardrail source, not as a visual renderer source

The old visual source should be removed after a dedicated purge validation:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens`
- `AndroidMerchantScreenRenderer.kt`
- `AndroidMerchantViewComponents.kt`
- `AndroidMerchantVisualDesign.kt`, only after replacing the tests that currently reference it

## Multi-agent Findings

### Agent 1 - Active UI Source

The active Android merchant app is mounted by:

- `MainActivity.kt`
- `PremiumMerchantApp.kt`

Current active route model:

- `landing`
- `onboarding`
- `main`
- `payment_detail`

Current active bottom tabs:

- `HOME` -> dashboard
- `REVUES` -> review queue
- `VENTES` -> orders
- `MENU` -> settings shell

Current active premium files:

- `PremiumMerchantApp.kt`
- `PremiumOnboardingState.kt`
- `PremiumOnboardingScreens.kt`
- `PremiumComponents.kt`
- `PremiumDashboardScreens.kt`
- `PremiumReviewScreens.kt`
- `PremiumMerchantRuntime.kt`
- `PremiumDesignTokens.kt`
- `Theme.kt`

Main gaps:

- No typed route tree.
- No full sub-screen navigation from menu rows.
- Orders are still mostly static.
- Receiving methods runtime exists but is not rendered as a full active screen.
- Settings is a shell, not a full hierarchy.
- Loading, empty, offline, action required and error states are not modeled consistently per screen.

### Agent 2 - Legacy / Mock UI Purge Candidates

No `ui.screens.*` imports are referenced from `MainActivity`, `PremiumMerchantApp`, tests, manifest or Gradle.

Low-risk purge candidates after build/test:

- `ui/screens/LandingScreen.kt`
- `ui/screens/OnboardingScreen.kt`
- `ui/screens/DashboardScreen.kt`
- `ui/screens/BankChannelsScreen.kt`
- `ui/screens/ConditionsScreen.kt`
- `ui/screens/OrdersScreen.kt`
- `ui/screens/ReviewScreen.kt`
- `ui/screens/SettingsScreen.kt`
- `ui/screens/PhoneSettingsScreen.kt`
- `ui/screens/SecurityCenterScreen.kt`
- `ui/screens/SyncEngineScreen.kt`
- `ui/screens/SupportScreen.kt`
- `ui/screens/ExactMerchantMockScreens.kt`

Medium-risk purge candidates:

- `AndroidMerchantScreenRenderer.kt`
- `AndroidMerchantViewComponents.kt`
- `AndroidMerchantVisualDesign.kt`

Reason for medium risk:

- They are not active UI, but `AndroidMerchantVisualDesign.kt` is referenced by Android visual architecture tests.
- Purge should replace those tests with premium-source assertions first.

High-risk files to keep:

- `AndroidMerchantUiModels.kt`
- `AndroidMerchantApiWiring.kt`
- `PremiumMerchantRuntime.kt`
- `MainActivity.kt`
- `AndroidManifest.xml`

## Files That Must Stay

These files protect the live wiring, privacy model and merchant-safe contracts:

- `AndroidMerchantApiWiring.kt`
- `AndroidMerchantUiModels.kt`
- `PremiumMerchantRuntime.kt`
- `MainActivity.kt`
- `NotificationAccessStatusReader.kt`
- `ReceiverOnboardingReadiness.kt`
- `AndroidManifest.xml`
- `AndroidMerchantApiWiringTest.kt`
- `AndroidMerchantUiContractTest.kt`
- `PremiumMerchantRuntimeContractTest.kt`
- `ReceiverOnboardingReadinessTest.kt`
- `BankSelectionOnboardingUiTest.kt`
- `ReceiverDiagnosticsTest.kt`

These backend/contract tests are not frontend implementation files, but they protect Android UI behavior and must not be weakened:

- `apps/api/src/android-merchant.test.ts`
- `packages/contracts/src/android-receiver.test.ts`
- `packages/contracts/src/checkout.test.ts`

## Screen / Sub-screen Target Map

### Onboarding

Target sub-screens and states:

- Landing
- Notification access required
- Notification settings handoff
- Notification access enabled
- SwimPay not found help state
- Bank selection
- Bank selection empty/unavailable
- Merchant profile
- Policy/manual validation setup
- Ready to scan
- Sync failed/retry

### Dashboard

Target states:

- loading
- ready
- action required
- offline
- receiver disconnected
- no payments yet
- review backlog
- webhook warning
- API fallback/dev mode

Target sub-actions:

- open reviews
- open recent payment detail
- open receiver health
- open connected site

### Receiving Methods

Target sub-screens:

- receiving methods list
- empty state
- create card
- create phone
- edit route
- disable route confirmation
- set default/recommended confirmation
- save success
- validation error
- API offline fallback

Rules:

- Raw card/phone may exist only during form entry/submission.
- After save, only masked values can be displayed.

### Banks

Target sub-screens/states:

- list V1 banks
- enabled
- needs setup
- paused
- review beta label
- unavailable

Rules:

- Do not show package name, cert hash, HMAC, evidence status or trust internals in merchant UI.

### Reviews

Target sub-screens/states:

- review queue list
- filters: all, to review, validated, rejected, expired
- empty state
- loading state
- offline/error state
- payment detail
- reason labels
- confirm modal
- reject signal modal
- reject order modal
- action in progress
- action success/failure

Rules:

- Signal reject must not reject the order by default.
- Order reject must remain explicit.
- Android calls backend review endpoints; Android does not decide.

### Orders

Target sub-screens:

- orders list
- search/filter
- empty state
- order detail
- checkout link/copy state
- payment session timeline
- expired/rejected/confirmed/manual confirmed states

### Connected Site

Target sub-screens/states:

- connected site overview
- test connection
- latest deliveries
- delivery detail
- developer details mode
- webhook failed
- no site configured
- copy developer key explicit action

Rules:

- Default mode must stay merchant-friendly.
- Technical event names only in explicit developer details mode.
- No webhook secret by default.

### Receiver Health / Settings

Target sub-screens:

- receiver health
- notification access status
- backend connection status
- outbox status
- last sync
- battery/background warning
- Android settings handoff
- security center
- support
- terms

### Configuration Test

Target states:

- checklist ready
- running
- passed
- action required: notification access
- action required: bank
- action required: receiving method
- action required: connected site
- failed/retry

Rules:

- Configuration test must never confirm a real payment.
- Android must never send developer webhooks directly.

## Proposed Sprint Groups

### Sprint 7J - Android Frontend Source-of-truth Cleanup

Goal:

Remove legacy/mock frontend code and make `ui/premium` the only active visual source.

Proposed tasks:

1. `413_android_frontend_legacy_reference_audit`
2. `414_android_frontend_legacy_purge`
3. `415_android_premium_visual_tests_replacement`
4. `416_android_frontend_source_of_truth_report`

Validation:

- Android JVM tests
- APK build
- root typecheck/lint/test/build
- manifest permission guardrails

### Sprint 7K - Premium Navigation and State Foundation

Goal:

Replace flat string/int UI routing with typed frontend navigation and reusable screen-state components.

Proposed tasks:

1. `417_android_premium_route_model`
2. `418_android_premium_screen_state_model`
3. `419_android_premium_state_components`
4. `420_android_premium_nav_shell`
5. `421_android_navigation_state_tests`

Key output:

- `PremiumRoute`
- `PremiumTab`
- `PremiumScreenState`
- `PremiumEmptyState`
- `PremiumErrorState`
- `PremiumLoadingState`
- `PremiumActionRequiredState`

### Sprint 7L - Onboarding and Dashboard Completion

Goal:

Complete onboarding sub-states and rebuild dashboard as a premium bento control surface.

Proposed tasks:

1. `422_android_onboarding_substates`
2. `423_android_notification_access_handoff_help`
3. `424_android_dashboard_bento_states`
4. `425_android_dashboard_drilldowns`
5. `426_android_onboarding_dashboard_tests`

### Sprint 7M - Receiving Methods and Bank Management

Goal:

Build full merchant receiving method and bank management sub-flows from existing API contracts.

Proposed tasks:

1. `427_android_receiving_methods_list_states`
2. `428_android_receiving_method_create_edit`
3. `429_android_receiving_method_disable_default`
4. `430_android_bank_management_screen`
5. `431_android_receiving_methods_bank_tests`

### Sprint 7N - Reviews and Orders

Goal:

Complete review queue/detail action states and add order list/detail surfaces.

Proposed tasks:

1. `432_android_review_queue_filters_states`
2. `433_android_review_action_modals`
3. `434_android_review_action_result_states`
4. `435_android_orders_list`
5. `436_android_order_detail_timeline`
6. `437_android_reviews_orders_tests`

### Sprint 7O - Connected Site, Receiver Health and Configuration Test

Goal:

Complete the operational merchant screens required before real shadow testing.

Proposed tasks:

1. `438_android_connected_site_full_screen`
2. `439_android_webhook_deliveries_developer_details`
3. `440_android_receiver_health_screen`
4. `441_android_configuration_test_flow`
5. `442_android_security_support_settings_shell`
6. `443_android_operational_screens_tests`

### Sprint 7P - Device QA and Visual Hardening

Goal:

Install on real device, capture UI tree/screenshots, fix only visual/responsive issues.

Proposed tasks:

1. `444_android_real_device_premium_navigation_qa`
2. `445_android_ui_tree_copy_guardrails`
3. `446_android_responsive_safe_area_hardening`
4. `447_android_premium_frontend_closeout`

## Deletion Strategy

Do not delete all suspected legacy files in the same commit as the navigation rewrite.

Safe sequence:

1. Add/adjust tests so premium UI is the asserted source of truth.
2. Delete `ui/screens/*`.
3. Delete `AndroidMerchantScreenRenderer.kt`.
4. Delete `AndroidMerchantViewComponents.kt`.
5. Delete `AndroidMerchantVisualDesign.kt` only after replacing its test coverage.
6. Run Android JVM tests.
7. Run APK build.
8. Install on device.

## Risks

Aggressive cleanup can break:

- Android compilation, because unused Compose files are still compiled.
- Static tests that inspect old catalog/model files.
- Runtime live API wiring if `PremiumMerchantRuntime` is bypassed by mock previews.
- Review action safety if `rejectSignal` and `rejectOrder` are merged accidentally.
- Notification access flow if Android permission and Notification Listener Access are confused.

## Recommendation

Proceed with Sprint 7J first.

Do not continue Sprint 7I real-notification shadow testing until the merchant app UI source of truth is clean enough to operate confidently.

The next implementation should be multi-agent, but with disjoint write scopes:

- Agent A: legacy purge and visual tests
- Agent B: typed navigation/state foundation
- Agent C: UI contracts and runtime preservation tests
- Agent D: reports/task queue/docs

No backend/API/payment behavior should be changed during this frontend cleanup wave.
