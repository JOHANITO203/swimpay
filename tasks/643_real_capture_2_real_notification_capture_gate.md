# Task 643 - REAL-CAPTURE-2 real notification capture gate

Status: gated_not_started

Goal: perform exactly one operator-owned real bank notification capture only after all previous REAL-CAPTURE-2 gates pass.

Preconditions:
- Bank detection passed.
- Receiver registration and heartbeat passed.
- Notification Listener access passed.
- Supported bank target activation passed.
- Synthetic redaction/outbox/upload passed.
- Backend Payment Intent Gate synthetic test passed.
- SDK/webhook rehearsal passed.
- Combined synthetic E2E metrics passed.
- Operator gives final explicit capture-start command.

Expected real behavior:
- Receiver sees one notification from an activated supported bank package.
- Raw notification text remains temporary in memory only.
- Redacted payload reaches backend.
- No active payment intent means no review.
- Active payment intent means manual review only.
- No `payment.confirmed` before manual merchant confirmation.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_REAL_NOTIFICATION_CAPTURE_REPORT.md`

Stop conditions:
- Any raw notification text crosses redaction boundary.
- Unsupported package enters pipeline.
- Android attempts order confirmation.
- Internal signal/review event becomes public fulfillment webhook.
- Any auto-confirmation path appears.
