# Task 462 - SDK Android Current State Audit

## Goal

Audit Android/APK developer integration readiness.

## Check

- Android SDK/helper
- Kotlin snippet
- checkout URL opener
- return deep-link handling
- fallback browser opener
- docs stating secret key must never be in APK
- tests

## Expected V1

Merchant Android app calls its own backend, backend creates SwimPay order, Android opens `checkout_url`, handles return URL/deep-link and never stores secret key, receives webhook directly or confirms payment.

## Output

Create `.swimpay-agent/SDK_ANDROID_AUDIT.md`.

