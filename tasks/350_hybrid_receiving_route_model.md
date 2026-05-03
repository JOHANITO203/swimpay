# Task 350 - Hybrid Receiving Route Model

Status: completed in Sprint 7B.

Scope:
- Define `MerchantReceivingRoute` for merchant-side receiving destinations.
- Support `phone_transfer` and `card_transfer`.
- Keep receiving route selection separate from payer bank launcher selection.
- Model `review_first` and `eligible_low_risk_later` route policies.

Safety:
- Routes never imply official bank confirmation.
- Card routes remain review-first in beta.
- Phone routes may become future low-risk only through explicit policy, not by default.
