# Checkout Receiver_arming Blocker Audit

Date: 2026-05-13

## Observed production-like staging facts

- New rehearsal session `2d130894-eb66-4391-a74c-d9a23c89ee8f` is stuck at `receiver_arming`.
- Session has:
  - `selected_receiving_route_id = null`
  - `amount_lease_id = null`
  - `receiver_armed_at = null`
  - no `review_queue` row
- Only audit event for this session: `order.created`.

## Root cause (code + runtime)

1. Pre-fix behavior set checkout to `receiver_arming` at order creation, before expected payment profile + route + lease were persisted.
2. This made `receiver_arming` an early decorative state and caused operational confusion in staging checks.
3. For the latest rehearsal session, buyer flow did not complete expected profile + continue-to-bank sequence, so:
   - no arming timestamp;
   - no fallback review eligibility after 120s;
   - no merchant review;
   - no final webhook.

## Mandatory questions answered

1. Who writes `status=receiver_arming`?
   - Now: `saveExpectedPaymentProfile(...)` transaction writes it (after profile + lease persistence).
2. Before/after route+lease?
   - After (post-fix). Previously: before, at order create.
3. If route selection fails, rollback?
   - Yes, mutation returns structured error (`not_found`/`amount_lease_unavailable`) and does not advance final flow.
4. If amount lease fails, rollback?
   - Yes, returns `amount_lease_unavailable`; no session advance.
5. If receiver arming fails, structured error?
   - Yes, `checkout_selection_incomplete`, `expected_payment_profile_required`, `payment_instructions_not_shown`, or `receiving_route_unavailable`.
6. Frontend can think Step 3 reached while backend not ready?
   - No for canonical API path: backend blocks `continue-to-bank` without required selections/profile/instructions.
7. Fallback worker ignores session if `receiver_armed_at` missing?
   - Yes, by design (`not_eligible: not_armed`).

## Classification

- aligned:
  - fallback precondition uses `receiver_armed_at`
  - no review creation without armed + due window
- partial:
  - operator expectations assumed webhook test could proceed before review eligibility
- missing:
  - none in code contract after this fix
- contradictory:
  - previous state naming behavior (`receiver_arming` too early) vs product truth
- dangerous:
  - interpreting `receiver_arming` as payable/reviewable readiness
- needs_tests_only:
  - additional regression around creation-time status already added in API tests

