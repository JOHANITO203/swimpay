# Task 717 - Checkout Step 4 paid claim and waiting

Status: completed

Goal: implement `J'ai paye` as buyer claim and waiting state.

Behavior:
- set `buyer_claimed_paid=true`;
- show safe waiting statuses;
- keep payment unconfirmed.

Output:
- `.swimpay-agent/BUYER_CHECKOUT_STEP4_REPORT.md`

Rules:
- buyer claim does not confirm;
- buyer claim does not emit webhook;
- signal detected copy must say merchant validation is pending.
