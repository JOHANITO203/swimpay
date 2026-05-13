# Late Buyer Claim Edge Case Report

Date: 2026-05-13

## Root Cause

`J'ai paye` used the generic checkout session mutation path, which only accepted `receiver_armed` as the current status. If the merchant had already made a final decision, the late buyer claim attempted an invalid transition and could surface as a broken web mutation behind the hosted checkout.

A second risk existed in the order of checks: expiry was evaluated before final-state reconciliation. A final confirmed session reopened later could be interpreted as expired instead of already confirmed.

## Fix

`markBuyerClaimedPaid` now uses a state-aware transaction:

- final confirmed sessions return `already_confirmed`;
- final rejected sessions return `already_rejected`;
- expired sessions return `already_expired`;
- duplicate buyer claims return `claim_recorded` without duplicate state changes;
- pending review states preserve their current status and record the buyer claim timestamp only;
- normal `receiver_armed` sessions still move to `buyer_claimed_paid`.

## Semantics Preserved

- `J'ai paye` still does not confirm payment.
- No public webhook is emitted by the buyer claim.
- `official_bank_confirmation=false` remains present in responses.

## Tests

- Already confirmed late claim returns 200 and buyer-safe confirmed state.
- Already rejected/expired late claims return deterministic final outcomes.
- Duplicate buyer claims are idempotent.
