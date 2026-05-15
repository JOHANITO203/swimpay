# Android Frontend Contract Contradictions Report

Date: 2026-05-15

## Contract Contradictions

### 1. Android review confirmation ownership

Finding: the active code and historical reports agree that Android Merchant keeps the
merchant-facing manual confirmation action, but the action must remain backend-owned.

Current code contains:

- `MerchantReviewActionsApiRepository.confirmReceived(...)`
- `PremiumMerchantRuntime.confirmReceived(...)`
- `PremiumPaymentDetailScreen(onConfirmReceived = ...)`
- UI button text `Confirmer reçu`

Existing tests require this path, for example:

- `PremiumMerchantRuntimeContractTest.premiumRuntimeConfirmReceivedUsesBackendManualConfirmationEndpointOnly`
- `AndroidMerchantVisualArchitectureTest` checks for `onConfirmReceived`.

Resolution: Android Merchant is allowed to submit the merchant's manual confirmation
to the backend. Android is still forbidden from confirming locally or emitting
developer webhooks directly.

Status: resolved as documentation drift. `docs/ANDROID_FRONTEND_API_CONTRACTS.md`
now documents `POST /v1/reviews/:id/confirm` as a backend-owned Android Merchant
review action.

Verification: targeted Android JVM tests pass for runtime contract, visual
architecture and navigation state.

### 2. Receiving routes vs receiving methods documentation drift

Finding: older `docs/ANDROID_MERCHANT_APP_SCREENS.md` sections still describe Android using:

- `GET /v1/merchant/receiving-routes`
- `POST /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`

Current Android frontend contract and code use product-facing receiving-method endpoints:

- `/v1/merchant/receiving-methods`

Risk: future agents may wire to the legacy route vocabulary and create duplicate code paths.

Recommended action: update docs to mark `receiving-routes` as internal/legacy and Android Merchant as `receiving-methods`.

### 3. Developer/integration surface remains too visible for merchant mode

Finding: integration screens are wired but still expose concepts such as webhook URL, API key creation, secret rotation and developer guide.

Risk: this conflicts with the merchant-friendly direction unless kept secondary and explicit.

Recommended action: keep wiring, but audit UI visibility next: default view should be merchant status/actions; developer details behind explicit action.

## No Forbidden Runtime Claims Found

Search did not find active user-visible text claiming:

- `bank_confirmed`
- `guaranteed_payment`
- `psp_confirmed`
- official bank confirmation
- wallet wording as product claim
