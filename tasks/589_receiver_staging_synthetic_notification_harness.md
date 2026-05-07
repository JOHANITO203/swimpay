# Task 589 - Receiver Staging Synthetic Notification Harness

Goal:
- Add a synthetic/staging harness that simulates supported-bank notification snapshots without using real bank notifications.

Required validation:
- supported bank notification accepted;
- unsupported package ignored;
- raw text rejected if it tries to leave redaction boundary;
- redacted signal envelope created;
- no payment confirmation occurs;
- no developer webhook emitted from Android.
- Add tests.

Do not:
- process real bank notifications;
- represent synthetic package/cert metadata as production trust;
- change backend payment or webhook semantics.

