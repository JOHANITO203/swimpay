# Next Action

generated_at: 2026-05-03T23:20:11+03:00

## Latest Sprint

Sprint 7F - Android Mobile Backend Gap Closure and Real-device QA Completion.

## Current Status

Sprint 7F implementation is code-complete, but final live backend validation is blocked by local Docker Desktop/containerd I/O errors.

Implemented:

1. `GET /v1/android-merchant/dashboard-summary`.
2. `GET /v1/android-merchant/payments/:id`.
3. `GET /v1/android-merchant/connected-site`.
4. `POST /v1/android-merchant/connected-site/test`.
5. `POST /v1/android-merchant/configuration-test`.
6. Android repositories for the five Sprint 7F endpoints.
7. Android frontend gap cleanup and docs.
8. API and Android tests for endpoint safety, UI model safety and backend-owned webhook/configuration-test actions.
9. Debug APK build, install, launch and UI-tree visual QA on Samsung SM-S916B `R5CWA0FEPZW`.

No real bank notifications were processed. Android still does not confirm or auto-confirm payments. Raw card/phone, raw notification text, package/cert, HMAC and webhook secrets remain out of merchant UI.

## Blocking Issue

Docker Desktop/containerd local storage is unhealthy.

Required before commit/private-beta validation:

1. Fully repair/restart Docker Desktop/WSL.
2. Rerun:
   - `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
   - `GET http://localhost:8080/api-health`
   - live Android endpoint QA with `adb reverse tcp:8080 tcp:8080`
3. If Docker recovers, rerun the final validation commands and commit Sprint 7F.

## Next Recommended Sprint

After Docker recovery and Sprint 7F validation:

Sprint 7G - Android merchant beta hardening and navigation polish.

Recommended Sprint 7G scope:

1. Production merchant auth/session handoff plan for the Android app.
2. Connected-site delivery history hardening.
3. Better screen navigation and state refresh polish.
4. Real-device visual QA with backend healthy.
5. Keep real bank notification shadow testing gated behind Sprint 6E consent rules.

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
