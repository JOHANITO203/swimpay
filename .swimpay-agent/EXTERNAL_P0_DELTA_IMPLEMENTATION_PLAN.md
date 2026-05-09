# External P0 Delta Implementation Plan

generated_at: 2026-05-09T23:10:00+03:00

Implemented in this delta:

1. Strengthen PAN Sensitive Boundary guardrails across security logger, observability, SDK order creation, SDK webhook parsing, public webhook worker and receiver upload contracts.
2. Persist receiver signal evidence metadata:
   - package name;
   - package certificate fingerprint;
   - payload hash;
   - shape hash;
   - profile version;
   - receiver classification/confidence;
   - redacted evidence envelope JSON.
3. Add matching-core `MatchConfidenceVector` and collision pressure calculation.
4. Add PostgreSQL structures for:
   - evidence columns;
   - match confidence vector;
   - amount leases;
   - worker idempotency ledger;
   - bank route certification matrix.
5. Add deterministic replay command scripts for parser/matching/privacy/webhook guardrails.

Deferred by design:

- PAN Kill Switch.
- Auto-confirmation.
- Real notification capture.
- Full amount lease allocation workflow.
- Worker idempotency claim wrapper.
- Merchant-facing risk UI.
- Privacy budget dashboard.
- Statement upload assist.
- Dispute Timeline V2.
