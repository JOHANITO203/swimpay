# P0-WIRE-1 Amount Lease Runtime Report

generated_at: 2026-05-09T23:57:28+03:00

## Result

Amount leases are now wired into checkout route selection.

When the hosted checkout selects a compatible receiving route, the API allocates an active `amount_leases` row inside the same PostgreSQL transaction that updates the payment session route and payable amount.

## Runtime Behavior

- `display_amount_minor` remains the merchant-visible product price.
- `reconciliation_delta_minor` is selected deterministically in the 1..99 minor-unit window.
- `payable_amount_minor` becomes the exact amount the buyer must transfer.
- Lease uniqueness is enforced for `merchant_id + route_id + rail + payable_amount_minor` while the lease is active.
- Existing active leases for the same payment session are released before allocating a new route/method lease.
- Manual merchant confirmation marks the active lease as `used`.
- Merchant rejection releases the active lease.

## Files

- `apps/api/src/orders.ts`
- `apps/api/src/reviews.ts`
- `apps/api/src/payment-sessions.test.ts`

## Tests

- Added coverage for unique payable amounts when multiple active sessions use the same merchant route and display amount.
- Existing checkout/session tests continue to verify route selection, buyer claims and non-confirming receiver arming.

## Safety

- No auto-confirmation was introduced.
- No webhook semantics changed.
- No PAN, raw phone or raw notification text is used by the lease engine.

## Notes

The Expected Payment Profile fingerprint remains an audit/matching hint created before route selection. Runtime matching uses the persisted payable amount, route, method and profile fields directly; a later refinement can version the fingerprint after lease allocation if we want that fingerprint to include the final leased amount.
