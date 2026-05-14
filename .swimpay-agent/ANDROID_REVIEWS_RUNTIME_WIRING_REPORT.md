# Android Reviews Runtime Wiring Report

generated_at: 2026-05-14T00:00:00+03:00

## Scope

Screens:
- Review Queue / File d'examen.
- Review Detail / Detail review.

## Result

- Status: wired_to_existing_runtime.
- Repositories reused:
  - `MerchantReviewQueueApiRepository`
  - `MerchantPaymentDetailApiRepository`
  - `MerchantReviewActionsApiRepository`
- Endpoints reused:
  - `GET /v1/reviews`
  - `GET /v1/android-merchant/payments/:paymentId`
  - existing review action endpoints through `MerchantReviewActionsApiRepository`

## Changes

- Removed `debug`/`staging` forced preview fixtures from `PremiumReviewsScreen`.
- Removed `debug`/`staging` forced preview fixtures from `PremiumPaymentDetailScreen`.
- Confirm/reject UI actions remain delegated to existing backend action repositories.

## States

- Loading, empty, offline/error and content states are rendered from `PremiumScreenState`.

## Fake Runtime Data Removed

- The fake Sberbank/T-Bank/VTB review preview list no longer replaces runtime state in staging.
- The fake review detail/evidence preview no longer replaces runtime state in staging.

