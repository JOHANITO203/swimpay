# Next Action

generated_at: 2026-05-02T22:09:47+03:00

## Latest Completed Sprint

Sprint 4F - Device-side Network Smoke Wiring.

## Status

PASS.

## What Passed

- Android debug backend config defaults to `http://127.0.0.1:8080`.
- ADB reverse `tcp:8080 tcp:8080` passed on real device `R5CWA0FEPZW`.
- Debug app-side HTTP client reached the local backend through the phone.
- App-side receiver registration passed.
- App-side heartbeat passed.
- App-side synthetic redacted signal upload passed and returned backend-decision-pending wording.
- App-side outbox enqueue passed with redacted/signed payload.
- App-side outbox flush passed with `acked=1 failed_retrying=0`.
- Compose backend remained healthy at `http://localhost:8080/api-health`.
- Full npm and Android validation passed.

## Next Recommended Sprint

Sprint 4G - Android persistent outbox and backend status polish.

Recommended tasks:

1. Persist debug receiver device id and local counter safely across Activity recreation.
2. Wire outbox smoke to the platform encrypted outbox adapter instead of in-memory debug state.
3. Add live backend health refresh to the app status screen.
4. Validate offline/online retry by removing and restoring adb reverse.
5. Keep all payloads synthetic and redacted.

## What Not To Do Next

- Do not deploy.
- Do not push without explicit request.
- Do not use real bank notifications.
- Do not add SMS permissions.
- Do not add accessibility scraping.
- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not trust `TO_VERIFY` package names or certificate fingerprints.
- Do not store raw phone or raw notification text.

