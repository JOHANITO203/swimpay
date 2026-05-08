# Task 629 - Android staging installable non-debug APK

Status: completed

Goal: create/install an Android staging APK that uses the real non-debug runtime path.

Scope:
- Add an installable `staging` build type if needed.
- Use `https://staging.swimpay.pro` as backend base URL.
- Use the configured Google web client ID as the Android server client ID for ID-token exchange.
- Install without clearing app data unless explicitly requested.

Guardrails:
- No real notification capture.
- No debug upload shortcuts for staging validation.
- No raw notification or PII logging.
