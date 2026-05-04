# Sberbank Shadow Consent

generated_at: 2026-05-04T23:50:00+03:00

## Scope Requested

Sprint 7I requests a controlled real-notification shadow test for exactly one bank:

- bank profile: `sber_ru`
- display name: Sberbank
- package: `ru.sberbankmobile`
- maximum live scope: one small controlled incoming-payment notification
- runtime mode: shadow / review-first only

## Consent State

Consent status: `pending_explicit_operator_confirmation`

The sprint request describes the required consent gate, but this session has not yet received a direct operator phrase explicitly authorizing live capture now, such as:

`I consent to one controlled Sberbank real-notification shadow test now.`

Until that explicit phrase is received, SwimPay must not capture, upload, parse or match a real Sberbank notification.

## Required Safety Flags

- real bank auto-confirm: disabled
- raw notification storage: disabled
- production trust change: forbidden
- non-Sberbank banks: out of scope
- SMS: forbidden
- Accessibility scraping: forbidden
- bank app scraping: forbidden
- broad app enumeration: forbidden

## Allowed Preflight

The following checks are allowed before explicit live-capture consent:

- Docker/Compose/API health checks
- Android build and JVM tests
- ADB device presence checks
- Receiver app install/launch if a device is visible
- Notification Listener Access state check without reading notifications
- safe backend evidence/status checks without exposing certificate hashes
