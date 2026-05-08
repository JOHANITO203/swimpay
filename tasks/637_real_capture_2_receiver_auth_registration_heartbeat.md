# Task 637 - REAL-CAPTURE-2 receiver auth registration heartbeat

Status: pending

Goal: prove the Android app has a valid staging mobile session, receiver registration and heartbeat before signal upload.

Test:
1. Inspect current in-app session state without clearing app data by default.
2. If needed, ask the operator before clearing app data and replaying login/create-account/onboarding.
3. Verify receiver device registration against staging.
4. Verify heartbeat reaches staging.
5. Record safe timing: auth decision time, registration latency, heartbeat latency.

Expected:
- Mobile session exists or can be created through the Android product flow.
- Receiver device belongs to the merchant.
- Private key never leaves device.
- No dev bearer is required in staging/prod mode.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_RECEIVER_AUTH_HEARTBEAT.md`

Guardrails:
- Do not expose account identifiers, tokens, cookies, device private keys or secrets.
- Do not process bank notifications.
