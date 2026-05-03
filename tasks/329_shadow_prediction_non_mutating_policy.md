# Task 329 - Shadow Prediction Non-mutating Policy

Status: completed

## Scope

Define shadow auto-confirm prediction as metadata only.

## Requirements

- Predict `would_auto_confirm`.
- Include confidence, missing gates and reason codes.
- Never mutate order state.
- Never emit `payment.confirmed`.
- Never release fulfillment.

## Result

Added `evaluateShadowAutoConfirmPrediction` to the contracts package. It returns notification-signal disclosure and non-mutating safety flags on every result.
