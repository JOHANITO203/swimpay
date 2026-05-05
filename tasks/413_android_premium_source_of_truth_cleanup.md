# Task 413 - Android premium source of truth cleanup

Status: completed

Scope:
- Keep `ui/premium` as the active Android merchant visual source of truth.
- Preserve runtime/API/manifest guardrail files.
- Do not change backend APIs, payment logic, review logic, notification processing or auto-confirmation.

Acceptance:
- Premium source-of-truth is protected by Android JVM/static tests.
- Legacy UI remains inactive.
