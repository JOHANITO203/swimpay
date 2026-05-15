# Android Manual Confirmation Logic Verification

Date: 2026-05-15

## Decision

Android Merchant is allowed to submit the merchant's manual confirmation. This is
part of the existing app mechanism and must be preserved.

## Verified Flow

1. Review detail screen exposes `Confirmer reçu`.
2. Compose action calls `activeRuntime.confirmReceived(currentRoute.reviewId)`.
3. `PremiumMerchantRuntime.confirmReceived(reviewId)` delegates to
   `MerchantReviewActionsApiRepository.confirmReceived(...)`.
4. The repository posts to `/v1/reviews/:id/confirm`.
5. Android reloads/resolves payment detail state from backend-owned action result.

## Guardrails Preserved

- Android does not confirm locally.
- Android does not emit developer webhooks.
- Android does not change payment state machine directly.
- Confirmation remains manual and backend-owned.
- Test payload contains `feedback_label=true_payment` and no webhook body.

## Documentation Fix

`docs/ANDROID_FRONTEND_API_CONTRACTS.md` previously said Android mobile sessions do
not call the manual confirmation endpoint. That statement was obsolete and has
been replaced with the backend-owned Android Merchant confirmation contract.

## Validation

- Targeted Android JVM tests passed:
  - `PremiumMerchantRuntimeContractTest`
  - `AndroidMerchantVisualArchitectureTest`
  - `PremiumNavigationStateTest`
- Focused confirmation tests passed:
  - `PremiumMerchantRuntimeContractTest.premiumRuntimeConfirmReceivedUsesBackendManualConfirmationEndpointOnly`
  - `AndroidMerchantVisualArchitectureTest.reviewDecisionActionsRunNetworkCallsOffTheComposeMainThread`
- `git diff --check` passed.
