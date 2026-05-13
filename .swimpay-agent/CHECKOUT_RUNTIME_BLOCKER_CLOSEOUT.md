# Checkout Runtime Blocker Closeout

Date: 2026-05-13

## Short conclusion

The primary blocker for the latest rehearsal was flow progression, not final webhook semantics:

- session did not reach armed/reviewable state;
- therefore no review confirmation path for that session;
- therefore no `payment.confirmed` webhook for that session.

## Answers required by closeout

1. Why was session stuck in `receiver_arming`?
   - Code path previously set arming too early at order creation; staging also shows sessions where profile/route/lease progression was not completed.

2. Which precondition was missing?
   - For the failed rehearsal session: `selected_receiving_route_id`, `amount_lease_id`, `receiver_armed_at` were absent.

3. Which code wrote state too early?
   - `buildOrderCreateInput(...)` (before fix) initialized order/session in arming states.

4. Which staging migration was missing?
   - No hard missing migration conclusively proven in this pass for this blocker.
   - Divergence came mostly from runtime assumptions and flow progression, plus mistaken assumptions about a `webhook_events` table.

5. Is a review now created?
   - For previous confirmed session: yes.
   - For the latest rehearsal session: no.

6. Can merchant confirm?
   - Yes when review exists (proved by previous `review.confirmed` + `manual_confirmed` session).

7. Is `payment.confirmed` created?
   - Yes in principle after review confirmation (worker contract).
   - Not observed for latest rehearsal session because no review existed.

8. Is `webhook_delivery` created?
   - Not for latest rehearsal session (expected with no final review decision).

9. Does external backend receive webhook?
   - Not proven yet for latest rehearsal path.

10. Is signature verified?
   - Not proven in this pass (requires external receiver proof logs).

11. Is external product fulfilled?
   - Not proven in this pass.

12. Which secrets must be rotated?
   - SDK secret key, webhook secret, mobile session bearer(s), and corresponding external backend env secret sync.

13. Which return target remains to configure?
   - Android host return scheme/deep-link capture and/or buyer-facing web return URL (non-API endpoint).

## Final blocker list

1. **Staging redeploy parity**
   - Ensure staging runs latest API/web/job-worker build containing arming-state fix.

2. **Operator flow execution**
   - Rehearsal must complete expected profile + instructions + continue-to-bank before fallback/review expectation.

3. **External webhook proof**
   - Need signed webhook receipt and signature validation evidence from external backend logs.

4. **Secret hygiene**
   - Rotate exposed test secrets/tokens before next full rehearsal.

