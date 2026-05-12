# Receiver Armed Window Report

Date: 2026-05-12

## Current Behavior

- Receiver arming starts on checkout Step 3: `continue-to-bank`.
- `markReceiverArmed` writes `payment_sessions.receiver_armed_at`.
- `J’ai payé` is not the first arming moment and remains only a buyer claim.
- No-notification fallback is due from `receiver_armed_at + NO_NOTIFICATION_FALLBACK_MIN_SECONDS`.
- Current configured fallback timeout is 120 seconds.

## Added Explicit Window

Added `payment_sessions.receiver_arm_expires_at`.

Migration:

- `packages/database/migrations/019_review_action_state_machine.sql`

Runtime:

- `receiver_arm_expires_at` is set to `payment_sessions.valid_until` when receiver arming succeeds.
- Final review decisions clear `receiver_arm_expires_at` with route lock and amount lease cleanup.

## Window Rules

Receiver armed window starts:

- `continue-to-bank`

Receiver armed window ends at the first of:

- backend manual confirmation;
- backend rejection;
- payment session expiration;
- `receiver_arm_expires_at`.

No payment is confirmed by arming alone.

