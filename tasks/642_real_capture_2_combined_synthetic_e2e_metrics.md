# Task 642 - REAL-CAPTURE-2 combined synthetic E2E metrics

Status: pending

Goal: run the full synthetic staging chain end-to-end and produce a timing baseline before real notification capture.

Flow:
1. Android session/receiver heartbeat ready.
2. Supported bank target active.
3. SDK creates order.
4. Checkout arms receiver.
5. Android sends synthetic signed redacted signal.
6. Backend ingests signal.
7. Payment Intent Gate creates manual review.
8. Merchant manually confirms.
9. Public webhook worker delivers `payment.confirmed`.
10. External app marks order fulfilled.

Metrics:
- total order-to-review latency;
- signal upload latency;
- backend ingestion latency;
- matching/gate latency;
- manual confirmation to webhook latency;
- webhook retry count;
- queue lag;
- failure reason codes.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_SYNTHETIC_E2E_METRICS.md`

Guardrails:
- Synthetic signal only.
- No real notification capture.
