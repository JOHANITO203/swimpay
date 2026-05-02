# 118 - Notification To Outbox To Backend E2E

## Goal

Run the safest possible real-device smoke path from synthetic notification to backend pending/review state.

## Scope

- Verify backend health at `http://localhost:8080/api-health`.
- Verify adb reverse to `http://127.0.0.1:8080`.
- Build, install and launch the debug APK.
- Trigger synthetic notification and/or deterministic debug pipeline.
- Verify listener capture, privacy firewall, outbox enqueue and backend upload when possible.

## Guardrails

- Use synthetic redacted data only.
- Do not use real bank apps or real bank notifications.
- Do not claim automated PASS if live listener capture must be manual.
