# Android security app lock report

generated_at: 2026-05-09T01:10:54+03:00

Implemented the merchant security sub-screen as a focused app-lock and Google account-linking surface.

## Result

- Added `PremiumAppLockSettings` and persisted local settings.
- Added timeout options: immediate, 1 minute, 5 minutes, 15 minutes.
- App lock gates UI access on resume only; receiver background upload is not blocked by the UI lock.
- Follow-up simplification: the Security screen now shows only Google account linking for reconnection and app lock controls. Non-functional rows such as PIN/password/biometric/connected sessions were removed.
- Google account linking now uses a dedicated `GoogleAccountLink` route and the authenticated backend `googleLink` contract. It is separate from login recovery, persists a local `googleAccountLinked` flag after success and never calls the recovery `googleExchange` flow from the Security screen.

## Safety

- No biometric permission, biometric dependency or custom system-unlock bridge remains in the app-lock implementation.
- No custom PIN, password or session-management store was introduced.
- Backend authorization remains authoritative.
- Google ID tokens are transient exchange inputs only and are not displayed or persisted as profile data.

## Known limit

- Full end-to-end app-lock resume behavior should still be manually tested after enabling app lock on a physical device.
