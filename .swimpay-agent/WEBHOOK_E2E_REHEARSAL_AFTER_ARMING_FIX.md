# Webhook E2E Rehearsal After Arming Fix

Date: 2026-05-13

## Gate condition

Run this rehearsal only after checkout session reaches review-confirmable state.

## Current status

- endpoint configured: **yes** (`webhook_endpoints` has active row for test merchant)
- latest rehearsal session reached review-confirmable state: **no**
- review created for latest rehearsal session: **no**
- `payment.confirmed` expected for latest session: **no (not yet eligible)**

## Why no delivery rows yet

`webhook_deliveries` is populated after final review decision events.
Latest session never reached:

- `receiver_armed` + due fallback or signal review
- merchant review confirmation

Therefore zero matching webhook deliveries for that session is expected.

## Next execution steps (strict order)

1. Create new order.
2. Complete checkout progression to expected profile + instructions + continue-to-bank.
3. Wait 120s fallback or generate safe synthetic review path.
4. Confirm review in Android Merchant.
5. Query `webhook_deliveries` by `payload_json` session/order ids.
6. Verify `status`, `attempt_count`, `last_http_status`.
7. Verify external backend receives and validates `SwimPay-Signature`.

## Result classification in this pass

- Status: **blocked_by_precondition_flow**
- Not a webhook worker failure in itself.

