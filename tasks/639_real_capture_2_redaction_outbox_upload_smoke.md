# Task 639 - REAL-CAPTURE-2 redaction outbox upload smoke

Status: pending

Goal: run a synthetic, redacted-only signal path from Android outbox to staging backend before any real notification.

Test:
1. Use synthetic/staging notification input only.
2. Prove redaction occurs before outbox enqueue.
3. Prove encrypted outbox stores redacted payload only.
4. Prove signed upload reaches staging.
5. Record safe timings: redaction, enqueue, flush, backend response.

Expected:
- `event_id`, `notification_hash`, `semantic_hash`, `local_counter`, payload hash and signature are present.
- `raw_text_present=false`.
- No raw title/body/bigText/textLines are stored or uploaded.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_REDACTION_OUTBOX_UPLOAD_REPORT.md`

Guardrails:
- Synthetic signal only.
- No payment confirmation.
- No developer webhook from Android.
