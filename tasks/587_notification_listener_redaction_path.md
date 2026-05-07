# Task 587 - Notification Listener Redaction Path

Goal:
- Wire notification listener handling to the redaction pipeline for supported targets.

Required:
- Raw title/body/bigText/textLines are temporary only.
- Raw notification text is never stored, logged or uploaded.
- Forwarded payload is redacted/safe only.
- Add tests.

Do not:
- process real bank notifications;
- weaken privacy firewall rules;
- expose raw phone/card/PII.

