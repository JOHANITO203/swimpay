# Task 588 - Receiver Outbox Real-Runtime Safety

Goal:
- Ensure real-runtime accepted notifications go through the encrypted outbox boundary.

Required:
- Generate safe `event_id`, `notification_hash` and `local_counter`.
- Retry must not duplicate unsafe payloads.
- Upload errors must not leak raw notification data.
- Add tests.

Do not:
- bypass encrypted outbox;
- upload raw notification title/body/text;
- add Android-side payment confirmation.

