# P0 Amount Lease Report

generated_at: 2026-05-09T23:10:00+03:00

Status: partially implemented.

Added:

- `amount_leases` table.
- Unique active index on merchant + route + rail + payable amount.
- Lease statuses: `active`, `used`, `expired`, `released`, `collision`.

Purpose:

- prevent same active payable amount for same merchant route and rail at PostgreSQL level.

Remaining:

- Allocation service in the checkout/order transaction.
- Concurrent 100-order stress test.
- Lease status update on confirmation/expiration.

This is now ready for the next sprint to wire the allocation path without relying on Valkey for final decisions.
