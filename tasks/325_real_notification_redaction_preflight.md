# Task 325 - Real Notification Redaction Preflight

Status: completed

## Scope

Define preflight checks that real notification shadow payloads must pass before upload, outbox storage or review routing.

## Requirements

- Reject raw phone values.
- Reject raw notification title/body/text fields.
- Reject raw customer identifiers.
- Allow only redacted fields, HMAC/masked hints and safe reason codes.

## Result

Added `validateRealNotificationRedactionPreflight` to the contracts package. It accepts only redacted title/body, amount/currency, HMAC or masked hints and reason codes.

Raw notification text storage remains disabled by default.
