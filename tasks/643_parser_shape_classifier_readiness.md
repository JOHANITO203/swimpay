# Task 643 - Parser / Shape / Classifier Readiness

Status: completed_ready_with_real_shape_pending

Objective: verify parser, shape and classifier readiness for five V1 banks.

Checks:
- Sberbank, T-Bank, VTB, Alfa-Bank, Gazprombank.
- incoming/outgoing/refund/cashback/promo/failed/unknown/amount-only.
- Incoming/outgoing shapes cannot collide.
- No raw PII stored.

Deliverable:
- `.swimpay-agent/PARSER_SHAPE_CLASSIFIER_READINESS.md`

Result:
- Synthetic and fixture coverage exists for five banks and negative categories.
- Real bank notification shape validation remains pending and must be done only after final explicit capture approval.

