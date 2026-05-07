# Real Bank Notification Capture Report

generated_at: 2026-05-08T00:00:00+03:00

## Status

Not executed.

## Reason

Real capture is allowed only in the operator-owned staging scope, but the staging stack was not reachable and receiver registration/heartbeat against staging was not proven.

## Required Before Capture

1. `https://staging.swimpay.pro/api-health` returns OK.
2. Receiver device is registered and active against staging.
3. Notification Listener Access is enabled.
4. Exactly one supported bank target is enabled.
5. A staging merchant and active payment intent are identified for the positive flow.
6. Operator gives the final capture-start command naming device, bank, amount and staging order.

## Safety Gate

If raw notification title/body/text crosses storage or upload, stop immediately and report a critical blocker.
