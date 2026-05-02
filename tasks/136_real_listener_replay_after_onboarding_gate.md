# Task 136 - Real Listener Replay After Onboarding Gate

Status: completed

## Goal

Verify the real Android Notification Listener Access gate before replaying live synthetic listener capture.

## Scope

- Verify Notification Listener Access from platform/ADB evidence and app status where possible.
- If disabled, open Android Notification Listener settings and stop live capture until the user manually re-enables it.
- Verify the Receiver readiness state is blocked only by the remaining readiness gates and never exposes an Android auto-confirm state.

## Guardrails

- Do not bypass Android settings.
- Do not use real bank notifications or real customer data.
- Do not add SMS, Accessibility, scraping, Android payment confirmation or Android auto-confirmation behavior.
