# Payment Review Fixture Removal Report

## Scope

- Removed the local payment-review design fixture from the active Android merchant UI path.
- Kept the real payment review component active by default.
- No backend, navigation, payment decision, or review action logic was changed.

## Active Default Flow

- Review list route: `PremiumMainTab.Reviews` renders `PremiumReviewsScreen(state = reviewsState, ...)`.
- Review list source: `PremiumMerchantRuntime.loadReviews()`.
- Review detail route: `PremiumRoute.PaymentDetail` loads `PremiumMerchantRuntime.loadPaymentDetail(reviewId)`.
- Review card component: `ReviewPaymentCard` remains the list item used by `PremiumReviewsScreen`.
- Review actions continue through runtime methods:
  - `confirmReceived(reviewId)`
  - `rejectSignal(reviewId)`
  - `rejectOrder(reviewId)`

## Removed Fixture Surface

- Removed local fixture injection from the review tab load path.
- Removed local fixture injection from the payment-detail load path.
- Removed local fixture bypasses in confirm/reject handlers.
- Removed fixture state helpers from the review runtime UI state companions.

## Verification Notes

- `rg` check: no remaining matches for `REVIEW_DESIGN_FIXTURE`, `designFixture`, `rev_design_fixture`, or fixture copy strings in the premium review runtime/app files.
- Expected runtime behavior: if staging has no real `needs_review` item, the review screen shows the real empty/live state instead of a fake local payment.

## Remaining Risk

- Visual validation of the review component still depends on receiving a real backend review item in staging.
- No artificial payment-review item remains available in the runtime path.
