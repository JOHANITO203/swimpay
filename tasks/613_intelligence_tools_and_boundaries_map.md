# Task 613 - Intelligence Tools and Boundaries Map

Status: completed

Scope:
- Mapped each SwimPay Intelligence tool by purpose, input, output, allowed actions, forbidden actions, owner layer, data classification and authority boundaries.
- Explicitly marked whether each tool can create review, emit webhook or mutate runtime rules.

Result:
- Main map: `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_BOUNDARIES.md`.
- Only backend runtime through Payment Intent Gate and review repository can create merchant review.
- Only backend review confirmation can lead to public `payment.confirmed`.
- Android, SDKs, feedback and unknown-shape tools cannot confirm, fulfill, emit merchant webhooks or mutate rules.

Validation:
- Enforced by `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_OF_TRUTH.md`.
- Guardrail test added in `tests/swimpay-intelligence-source-truth.test.ts`.
