# 090 Android Debug Backend Config

## Goal

Add debug-only Android backend configuration for local real-device smoke tests over `adb reverse`.

## Scope

- Default debug backend URL: `http://127.0.0.1:8080`.
- Document required reverse command: `adb reverse tcp:8080 tcp:8080`.
- Add debug-only cleartext HTTP configuration if needed for local development.
- Ensure release builds do not expose debug smoke controls or debug backend behavior.

## Forbidden

- Do not hardcode a production URL.
- Do not weaken release network security.
- Do not add SMS, Accessibility, scraping or payment confirmation behavior.
- Do not use real bank package names or signing certificate fingerprints.

## Acceptance Criteria

- Debug config is explicit and local-only.
- Release mode does not expose debug actions.
- Documentation explains local reverse setup.
- Tests cover default URL and debug-only boundaries where possible.

