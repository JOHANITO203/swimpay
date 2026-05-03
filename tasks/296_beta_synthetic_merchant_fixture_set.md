# Task 296 - Beta Synthetic Merchant Fixture Set

Status: completed

## Scope

Create private beta rehearsal fixtures for one synthetic merchant, one synthetic order/payment session and five review-only bank signal scenarios.

## Result

Fixtures live at `packages/bank-templates/private-beta-merchant-order-fixtures.json`.

## Safety

Fixtures use HMAC/masked buyer identity only. They contain no raw phone, no raw notification text, no real customer data and no real notification sample.
