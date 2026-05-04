# Task 409 - Sberbank Real Notification Capture and Redaction

Status: blocked_pending_explicit_live_consent

Scope:
- Capture, if explicitly authorized and triggered, one controlled Sberbank incoming notification through NotificationListener only.
- Filter by exact package `ru.sberbankmobile`.
- Redact locally before upload.
- Upload/store redacted fields only:
  - amount if visible;
  - currency if visible;
  - masked/HMAC sender hints if visible;
  - reference HMAC/masked if visible;
  - reason codes;
  - notification hash/event id;
  - package id.

Forbidden:
- No raw title/body storage.
- No raw notification logs.
- No SMS.
- No Accessibility.
- No bank app scraping.
- No broad package enumeration.

Result:
- Not executed.
- No real Sberbank notification was captured, read, uploaded or logged.
- Awaiting explicit live-capture consent and one controlled incoming Sberbank notification.
