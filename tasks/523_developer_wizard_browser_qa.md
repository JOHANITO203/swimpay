# Task 523 - Developer wizard browser QA

Status: completed

Checks:
- Static web rendering and server-inject QA are covered by the Sprint 9G tests.
- `/merchant/developer-integration` renders the safe unavailable state when merchant lifecycle auth is not configured.
- The unavailable state is safe when merchant lifecycle auth is not configured.
- After Docker restart, `/merchant/developer-integration` returns HTTP 200 through the local proxy.

Limitations:
- This sprint did not change Android source, so no APK/device install was required.
