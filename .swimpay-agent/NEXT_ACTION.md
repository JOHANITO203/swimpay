# Next Action

generated_at: 2026-05-03T21:39:35+03:00

## Latest Sprint

Sprint 7E - Android Merchant API Wiring, Authenticated Review Actions and Real-device Visual QA.

## Current Status

Sprint 7E passed.

Implemented:

1. Android merchant auth/session boundary with safe missing-auth state.
2. Local/dev merchant bearer auth contract clearly marked as local/dev.
3. Receiving methods API wiring for live merchant route list/create/update.
4. Review queue API wiring for live open review list.
5. Review action API wiring for confirm, signal-scope reject and order-scope reject.
6. Explicit typed mock boundaries for dashboard, connected site and configuration test.
7. Android API gap documentation cleanup.
8. Android JVM tests for auth, route wiring, review actions, no raw identifiers and mock gaps.
9. Android debug APK build, install, launch and UI-tree visual QA on Samsung SM-S916B `R5CWA0FEPZW`.

No real bank notifications were processed. Android still does not confirm or auto-confirm payments. Raw card/phone, raw notification text, package/cert, HMAC and webhook secrets remain out of merchant UI.

## Validation Notes

Docker was initially unavailable, then the user restarted Docker. Compose service status and `http://localhost:8080/api-health` passed after restart.

ADB command execution worked through the local SDK path. The authorized real device `R5CWA0FEPZW` was connected for install, launch and UI-tree viewport inspection.

## Next Recommended Sprint

Sprint 7F - Android mobile backend gap closure and merchant UX polish.

Recommended Sprint 7F scope:

1. Add backend/mobile endpoints for dashboard summary, payment detail by id, connected-site status/test and configuration test.
2. Replace remaining mock repositories where backend endpoints become available.
3. Add richer merchant UX polish while preserving approved copy and guardrails.
4. Keep real bank notification shadow testing gated behind Sprint 6E consent rules.

## What Not To Do Next

- Do not process real bank notifications without the Sprint 6E consent gate.
- Do not enable real-bank auto-confirmation.
- Do not claim official bank confirmation.
- Do not store raw notification text by default.
- Do not store raw phone/card in webhooks, logs or audit.
- Do not read SMS.
- Do not scrape bank apps.
- Do not use SBP behavior.
- Do not enumerate installed apps broadly.
- Do not treat Android merchant review actions as direct developer webhook sending.
