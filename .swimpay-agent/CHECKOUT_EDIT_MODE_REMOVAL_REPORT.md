# Checkout Edit Mode Removal Report

Date: 2026-05-13

## Decision Applied
- Removed buyer runtime edit affordance from hosted checkout.
- Ignored `checkout_edit=1` query parameter in runtime flow resolution.

## Changes Implemented
- Removed "Annuler et modifier les infos" checkout runtime CTA from instructions stage.
- Removed `forceBuyerIdentity` option from checkout rendering contract.
- Removed `readCheckoutEditMode()` usage in web route wiring.
- Restored canonical step resolver without query override.

## State Machine Safety
- Final states remain authoritative and are not bypassed by query params.
- Waiting state remains authoritative and is not bypassed by query params.
- Instructions state remains authoritative and does not jump back to buyer info via URL query.

## Tests Added/Updated
- No runtime edit button is rendered.
- `checkout_edit=1` is ignored for `manual_confirmed`, `rejected`, `expired`.
- `checkout_edit=1` is ignored for waiting/review state.
- `checkout_edit=1` is ignored for instructions state.

## Outcome
- Checkout flow remains guided and non-editable after instructions/signal tracking states.
- No query-based short-circuit of final status.
