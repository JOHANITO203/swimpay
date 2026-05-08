# Task 640 - REAL-CAPTURE-2 backend intent gate metrics

Status: pending

Goal: prove backend signal ingestion and Payment Intent Gate behavior with metrics before real capture.

Test:
1. Upload a signed synthetic redacted signal with no active payment intent.
2. Verify no merchant review is created.
3. Create a staging order/payment intent through the SDK/API path.
4. Upload a matching signed synthetic redacted signal.
5. Verify manual review only.
6. Record timings: ingestion, parsing, matching, intent gate, review creation.

Expected:
- No active payment intent means no review.
- Active intent plus matching signal creates manual review only.
- Matching 100% remains review copy only.
- No `payment.confirmed` before merchant manual confirmation.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_BACKEND_INTENT_GATE_METRICS.md`

Guardrails:
- Synthetic redacted signal only.
- No public internal signal/review webhooks.
