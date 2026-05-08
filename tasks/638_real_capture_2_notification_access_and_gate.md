# Task 638 - REAL-CAPTURE-2 notification access and target gate

Status: pending

Goal: prove Notification Listener readiness and activated supported-bank gating without processing real notification contents.

Test:
1. Verify Notification Listener access state.
2. Verify selected/activated supported-bank targets.
3. Verify unsupported package notifications would be ignored before redaction/outbox/upload.
4. Record safe readiness metrics only.

Expected:
- Listener access is explicitly enabled by the operator.
- Only activated supported bank package targets can enter the listener pipeline.
- Android remains capture/redact/sign/upload only.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_NOTIFICATION_GATE_REPORT.md`

Guardrails:
- Do not capture or dump real notification title/body/text.
- Do not use SMS, Accessibility, scraping or broad package enumeration.
