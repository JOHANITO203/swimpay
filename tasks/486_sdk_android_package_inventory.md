# Task 486 - Android SDK package inventory

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

Goal:
Audit current Android SDK/helper files, docs and examples before implementation.

Acceptance:
- Confirm the existing Android app is the SwimPay Receiver, not a merchant SDK.
- Decide package location.
- Create `.swimpay-agent/SDK_ANDROID_PACKAGE_INVENTORY.md`.
- Do not implement before inventory.

Safety:
- No secret key in Android code.
- No Receiver notification processing changes.
- No SMS, Accessibility, `QUERY_ALL_PACKAGES` or broad package enumeration.
