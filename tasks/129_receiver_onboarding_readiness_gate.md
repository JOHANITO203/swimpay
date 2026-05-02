# 129 - Receiver Onboarding Readiness Gate

## Goal

Implement the Android Receiver readiness gate before real listener replay.

## Requirements

- Receiver cannot be marked ready unless Notification Listener Access is enabled.
- Receiver cannot be marked ready unless at least one bank profile is selected.
- Receiver cannot be marked ready unless backend config exists.
- Receiver cannot be marked ready unless device registration is completed or safely pending.
- If Notification Listener Access is disabled:
  - `receiver_ready = false`
  - `capture_enabled = false`
  - `upload_enabled = false`, except safe debug/test actions.

## Boundaries

- Do not bypass Android settings.
- Do not add SMS, scraping, or Android payment confirmation.
- Do not trust `TO_VERIFY` bank package/cert metadata.

## Status

Completed in Phase 4J.
