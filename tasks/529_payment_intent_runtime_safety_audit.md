# Task 529 - Payment Intent Runtime Safety Audit

## Goals

- Verify and strengthen tests for payment-intent-bound safety:
  - no active payment intent means no merchant payment review;
  - unrelated/negative/background/unknown-without-intent activity creates no review or webhook;
  - buyer claimed paid and receiver armed never confirm;
  - Matching 100% remains manual-review-only;
  - Android never confirms orders or sends developer webhooks;
  - public `payment.confirmed` remains post-manual-confirmation only.

## Safety

- Do not change payment confirmation behavior.
- Do not enable auto-confirmation.

