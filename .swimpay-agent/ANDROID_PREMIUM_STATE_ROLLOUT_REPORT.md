# Android Premium State Rollout Report

generated_at: 2026-05-05T06:30:00+03:00

## Scope

Sprint 7L rolled the typed premium state model across the active Android merchant frontend path:

`MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime -> ui/premium`

No backend API, contract, worker, database, payment decision, review decision, notification capture or auto-confirmation behavior was changed.

## Multi-agent Audit Input

Read-only subagents audited the existing state gaps before implementation:

- Dashboard/home/orders: dashboard and recent payments could fall back to preview data; orders were static.
- Reviews/detail: review queue and payment detail collapsed empty/error/action-required states into preview content.
- Menu/sub-screens: connected site and configuration test collapsed non-success states; receiving methods and other sub-screens needed typed route-specific state surfaces.

## Dashboard State Rollout

- `PremiumMerchantRuntime.loadDashboard()` now returns `PremiumScreenState<PremiumDashboardUiState>`.
- Empty dashboard data returns an empty state instead of preview recent payments.
- Error/action-required/loading states render through `PremiumStatePanel`.
- Content still uses the existing premium dashboard layout.

## Reviews State Rollout

- `PremiumMerchantRuntime.loadReviews()` now returns `PremiumScreenState<PremiumReviewsUiState>`.
- Empty review queues show a real empty state.
- Error/action-required/loading states render through `PremiumStatePanel`.
- The review list no longer uses preview rows for non-success repository states.

## Payment Detail State Rollout

- `PremiumMerchantRuntime.loadPaymentDetail()` now returns `PremiumScreenState<PremiumPaymentDetailUiState>`.
- Missing or failed payment detail requests render an error/action-required state instead of fake payment detail content.
- Review action buttons are only shown for content states.
- Confirm/reject actions remain backend-owned and then refresh the detail state.

## Orders State Rollout

- Added `PremiumOrderUiItem` and `PremiumOrdersUiState`.
- Replaced the static order demo list with a typed empty state for now.
- No order backend behavior or API contract was invented.

## Menu and Sub-screen State Rollout

- Added typed state holders in `PremiumMerchantApp` for connected site, configuration test, receiving methods and orders.
- Added `PremiumReceivingMethodsStateScreen`.
- Connected site and configuration test sub-screens now render typed content/error/action-required states.
- Banks, Receiver health and Order detail keep route-specific premium state placeholders until their live endpoints are defined.

## Tests

- Updated `PremiumMerchantRuntimeContractTest` to assert typed state results from dashboard, reviews, payment detail, connected site, configuration test and review actions.
- Added regression coverage that empty/error states do not show demo values such as `rev_demo`, `58,41`, `TANGO ALFA`, raw identifiers, webhook secrets or official-bank-confirmation claims.
- Updated `AndroidMerchantVisualArchitectureTest` to assert premium screens consume typed `PremiumScreenState` and that runtime no longer returns preview content for non-success states.

## Validation Notes

- Initial targeted Gradle run failed because the Kotlin daemon/JVM ran out of native memory.
- Retried with in-process Kotlin compilation and constrained JVM args.
- Targeted Android tests passed.
- Full Android JVM tests passed.
- Real-device ADB install/launch passed on Samsung `SM_S916B` / `R5CWA0FEPZW`.
- ADB UIAutomator initially confirmed mojibake in the installed APK (`Donn?es indisponibles`).
- Premium Kotlin copy was rebuilt with corrected UTF-8 strings.
- Reinstalled APK UIAutomator and screenshot evidence now show `Données indisponibles` and `RÉESSAYER` correctly.
- Root validation passed for `android:doctor`, `typecheck`, `lint`, `test`, `build` and Compose config.
- Fresh Docker live checks are currently blocked because Docker Desktop's Linux engine pipe is unavailable from this shell.

## Safety Result

- Android still does not confirm orders directly.
- Review confirm/reject stays through backend-owned repositories.
- Signal reject remains signal-scoped.
- No developer webhook is sent directly by Android.
- No SMS, Accessibility scraping, installed-app enumeration, real bank notification processing, raw PII exposure or auto-confirmation was added.

## Remaining Limitations

- Banks, Receiver health and Order detail remain premium placeholder state screens pending dedicated frontend/backend contracts.
- No remaining visible mojibake was observed in the checked premium state screen after reinstall.
- A broader real-device visual QA pass across every premium tab is still recommended for Sprint 7M.

## Next Recommended Sprint

Sprint 7M: Android premium receiving methods and bank management state completion.

Recommended scope:

1. Add full premium receiving-method create/edit/disable/recommend sub-states.
2. Add premium bank management states for enabled, paused and action-required banks.
3. Normalize merchant-facing copy encoding in premium Kotlin strings.
4. Keep all backend/API/payment behavior unchanged unless a separate contract sprint is opened.
