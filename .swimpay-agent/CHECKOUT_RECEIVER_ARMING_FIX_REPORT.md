# Checkout Receiver_arming Fix Report

Date: 2026-05-13

## Fix objective

Prevent checkout sessions from entering `receiver_arming` before hard preconditions are persisted.

## Code changes

1. `apps/api/src/orders.ts`
   - `buildOrderCreateInput(...)`:
     - `orders.status`: `receiver_arming` -> `payment_session_created`
     - `payment_sessions.status`: `receiver_arming` -> `created`
   - `saveExpectedPaymentProfile(...)`:
     - now sets `payment_sessions.status='receiver_arming'` inside the same transaction that persists expected profile and lease
     - updates `orders.status='receiver_arming'` in same transaction
   - creation audit path:
     - `payment_session.receiver_arming_requested` removed at creation stage
     - `payment_session.created` remains canonical creation event

2. `apps/api/src/server.ts`
   - `toOrderReadResponse(...).latest_event` aligned to `payment_session.created`

3. Tests updated
   - `apps/api/src/orders.test.ts`
   - `apps/api/src/payment-sessions.test.ts`
   - `apps/api/src/prod-mode-staging.test.ts`

## Why this is root-cause and not a shim

- It changes the state machine transition point itself.
- It does not hide errors or drop audit metadata.
- It keeps deterministic precondition sequencing: create -> profile/lease -> arming -> armed -> review/final.

## Result

- `receiver_arming` is no longer emitted at order creation.
- Sessions only enter `receiver_arming` after profile/route/lease data is committed.
- Staging sessions that never submit expected profile stay in `created`, making diagnostics truthful.

