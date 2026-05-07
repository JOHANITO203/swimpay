# Task 579 - Signal Runtime Manual-Only Gate

Goal:
- Make the active signal runtime manual-confirm-only for V1.

Required:
- Runtime must not call `autoConfirmSignal`.
- Strong matches create review only.
- `Matching 100 %` remains review copy only, not confirmation.
- `receiver_armed` and `buyer_claimed_paid` remain non-confirming.
- No active payment intent remains no review.
- Negative activity remains rejected/no confirm.

Tests:
- trusted exact signal returns `needs_review`, not `auto_confirmed`;
- no `payment.confirmed` webhook request before manual review;
- repeated signal remains idempotent;
- amount-only/collision/unknown paths stay cautious.

