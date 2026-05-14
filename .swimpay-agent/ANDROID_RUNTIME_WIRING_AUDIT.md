# Android Runtime Wiring Audit

Scope: Android Merchant runtime wiring only. No backend, API contract, payment runtime, webhook runtime, receiver runtime, SDK behavior or visual redesign is in scope.

## Dashboard / Accueil
- partially_wired: `PremiumMerchantRuntime.loadDashboard()` uses `MerchantDashboardApiRepository` in app builds.
- mock_runtime_data: `PremiumDashboardScreen()` currently replaces the provided state with `premiumDashboardPreviewState()` for `debug` and `staging` builds.
- unsafe_fake_data: forced staging preview can show `85 920 RUB`, fake chart, fake webhook `Excellent`, fake recent activity.
- missing_loading_state: generic `PremiumStateList` exists.
- missing_error_state: generic `PremiumStateList` exists.
- missing_empty_state: runtime mapping exists, but forced preview can hide it.

## Review Queue / File d’examen
- partially_wired: `PremiumMerchantRuntime.loadReviews()` uses `MerchantReviewQueueApiRepository`.
- mock_runtime_data: `PremiumReviewsScreen()` replaces provided state with `PremiumReviewsUiState.preview()` for `debug` and `staging`.
- unsafe_fake_data: forced staging preview can show fake Sberbank/T-Bank/VTB queue rows.
- missing_loading_state: generic review state exists.
- missing_error_state: generic review state exists.
- missing_empty_state: runtime mapping exists, but forced preview can hide it.

## Review Detail / Détail review
- partially_wired: `PremiumMerchantRuntime.loadPaymentDetail()` uses `MerchantPaymentDetailApiRepository`; actions use `MerchantReviewActionsApiRepository`.
- mock_runtime_data: `PremiumPaymentDetailScreen()` replaces provided state with `PremiumPaymentDetailUiState.preview()` for `debug` and `staging`.
- unsafe_fake_data: forced staging preview can show fake evidence/detail.
- missing_loading_state: generic detail state exists.
- missing_error_state: generic detail state exists.

## Receiving Methods / Méthodes de réception
- partially_wired: `PremiumMerchantRuntime.loadReceivingMethods()` uses `MerchantReceivingMethodsApiRepository`.
- mock_runtime_data: `PremiumReceivingMethodsStateScreen()` replaces provided state with `premiumReceivingMethodsPreviewState()` for `debug` and `staging`.
- unsafe_fake_data: forced staging preview can show fake Sberbank/T-Bank/VTB card/phone routes.
- missing_loading_state: generic state exists.
- missing_error_state: generic state exists.
- missing_empty_state: runtime mapping exists, but forced preview can hide it.

## Integrations List / Sites & intégrations
- partially_wired: `PremiumMerchantRuntime.loadConnectedSite()` and developer integration flows use backend repositories.
- mock_runtime_data: `PremiumIntegrationsListStateScreen()` uses `premiumConnectedSitePreviewState()` for design fixture builds.
- unsafe_fake_data: forced staging preview can show `merchant.example`, fake API/webhook status.
- missing_repository: no separate multi-site list repository was found; current runtime source appears to be connected-site/developer integration detail.

## Integration Detail / Détail intégration
- already_backend_wired: developer integration detail/actions use `MerchantDeveloperIntegrationApiRepository` and `MerchantConnectedSiteApiRepository`.
- partially_wired: show-once secret handling exists; raw secrets are not intended to be rendered.
- missing_empty_state: current generic empty exists but copy still needs runtime-safe accent cleanup.

## Receiver Health / Santé récepteur
- partially_wired: `PremiumMerchantRuntime.loadReceiverHealth()` derives notification access, heartbeat/outbox/runtime state from Android/local runtime inputs.
- mock_runtime_data: `PremiumReceiverHealthStateScreen()` replaces provided state with `premiumReceiverHealthPreviewState()` for `debug` and `staging`.
- unsafe_fake_data: forced staging preview can show `Sain` even when receiver state is not confirmed.
- missing_backend_contract: backend receiver health detail coverage is limited; local runtime state is the current safe source.

## Security Settings / Sécurité & paramètres
- partially_wired: app lock and Google link state are wired through local/auth state.
- unsafe_fake_data: screen still renders static fake session/device rows (`Android • Pixel 7 Pro`, IPs, `2 actives`).
- missing_repository: no real active-session/device-session list repository was found for this screen.
- can_derive_safely: app lock timeout, current auth state, Google linked state can be rendered honestly.

## Onboarding
- already_backend_wired: account creation, bank targets, receiving method submission and webhook-test-only path have runtime repositories.
- preview_only_mock_ok: Compose defaults/previews may remain mock-only when not used by app runtime.

## Audit Decision
- Primary coding fix: remove build-type forced preview replacement from runtime screens.
- Secondary fix: replace Security fake session rows with honest local/current-session state or unavailable state.
- Guardrails needed: no design fixture forced by `BuildConfig.BUILD_TYPE`, no `merchant.example`/fake dashboard/review rows in runtime paths, no local confirmation.
