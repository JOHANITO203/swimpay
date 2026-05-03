# 410 - Android real-device full-flow visual QA

Status: blocked_by_docker_environment

Scope:
- Build, install and launch the Android Receiver on an authorized connected device if available.
- Verify dashboard, receiving methods, review queue, payment detail, connected site, test action and configuration test render safely.
- Dump UI tree and check for raw PII or forbidden merchant-facing jargon.
- Do not run `pm clear` unless explicitly needed.
