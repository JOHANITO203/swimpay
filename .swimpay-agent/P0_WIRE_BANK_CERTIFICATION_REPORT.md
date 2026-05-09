# P0-WIRE-1 Bank Certification Gate Report

generated_at: 2026-05-09T23:57:28+03:00

## Result

The bank route certification matrix is now consumed by checkout and signal matching gates.

## Checkout Gate

Checkout route discovery and selection now require a compatible `bank_route_certifications` row for the selected bank/package/rail.

Allowed runtime statuses:

- `certified`
- `observed`
- `experimental`
- `review_only`

Blocked statuses:

- `package_validation_pending`
- `disabled`
- missing certification

This keeps Ozon Bank present as review-only/package-validation-pending data, but prevents runtime checkout/capture enablement until package/certificate validation is complete.

## Matching Gate

Signal runtime now loads certification status from `bank_route_certifications`.

- `package_validation_pending` is rejected before parser/review creation.
- `disabled` is rejected before parser/review creation.
- `experimental` and `unknown` enrich reason codes and lower trust context without confirming anything.

## Files

- `apps/api/src/orders.ts`
- `apps/api/src/payment-sessions.test.ts`
- `apps/signal-worker/src/runtime.ts`
- `apps/signal-worker/src/runtime.test.ts`

## Tests

- Checkout no longer exposes routes while certification is package-validation-pending.
- Signal runtime rejects package-validation-pending certification before review creation.

## Safety

- Ozon runtime capture remains disabled until exact package/cert evidence is validated.
- No broad package enumeration, scraping or `QUERY_ALL_PACKAGES` was added.
- Strong matching still creates manual review only.
