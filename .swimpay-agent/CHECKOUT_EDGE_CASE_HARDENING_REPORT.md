# Checkout Edge Case Hardening Report

Date: 2026-05-13

## Edge Cases Covered

- Buyer taps `J'ai paye` after merchant confirmation.
- Buyer taps `J'ai paye` after rejection.
- Buyer taps `J'ai paye` after expiration.
- Duplicate buyer claim.
- Buyer returns to checkout after final merchant decision.
- Merchant confirms while buyer is on waiting screen.
- Final CTA with Android SDK return scheme.
- Final CTA with web return URL.
- Final CTA with missing or unsafe return target.
- Raw API JSON-like return endpoint.

## Behavior

- No 5xx state is expected for already-final buyer claims.
- Final state remains final and is never reopened by buyer action.
- Waiting screen polling remains the reconciliation path for merchant decisions.
- Final CTA degrades to history fallback if no safe return target exists.

## Out Of Scope

- External product release logic.
- Real bank notification processing.
- Any change to public webhook event policy.

## Validation Update

- Targeted API/web checkout tests passed.
- Full `npm test` passed.
- Hosted checkout visual baselines were recorded and verified after the intentional copy update.
