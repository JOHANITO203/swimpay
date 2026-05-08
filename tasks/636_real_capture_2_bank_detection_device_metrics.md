# Task 636 - REAL-CAPTURE-2 bank detection device metrics

Status: pending

Goal: prove exact supported-bank detection on the operator phone and record safe timing/health metrics.

Test:
1. Install or keep the staging APK.
2. Launch the app.
3. Verify the bank card/screen shows the exact supported-bank detection count.
4. Verify no broad installed-app enumeration is used.
5. Record safe timing only: app launch time, UI detection time and detected count.

Expected:
- Supported installed bank apps are visible through exact package queries.
- Unsupported apps are not enumerated.
- Detection is visibility only, not trust.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_BANK_DETECTION_METRICS.md`

Guardrails:
- Do not run `pm list packages`.
- Do not add `QUERY_ALL_PACKAGES`.
- Do not capture notifications.
