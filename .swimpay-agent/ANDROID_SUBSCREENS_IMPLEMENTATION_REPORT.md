# Android merchant sub-screens implementation report

generated_at: 2026-05-09T01:10:54+03:00

## Summary

Implemented the Android merchant settings sub-screen sprint for Help, Support, Security, Language, Appearance and Confirmation Mode.

## Inventory result

- Active Android source remains `ui/premium`.
- Several rows existed but were inert; they now route to typed screens.
- Support and confirmation settings needed backend contracts.

## Screens implemented

- Centre d'aide: static V1-safe help content with search.
- Contacter le support: form, validation, safe context and durable backend ticket creation.
- Securite: dedicated Google account linking for future reconnection plus local app lock enable/disable and timeout. Non-functional PIN/password/biometric/connected-session rows were removed.
- Langue: FR/EN/RU options, persisted selection, login switch and visible localized copy on login/menu/settings surfaces.
- Apparence: system/light/dark persisted theme mode with premium color tokens switching visibly.
- Mode de confirmation: manual V1 truth plus IA future direction shown as inactive and next-update only.
- Bank icons: added Sberbank, T-Bank, VTB, Alfa-Bank and Gazprombank drawable assets and surfaced them in bank/receiving-method UI.

## Backend contracts

- `POST /v1/android-merchant/support-tickets`
- `GET /v1/android-merchant/confirmation-settings`
- `PUT /v1/android-merchant/confirmation-settings`
- Additive migration: `012_android_merchant_support_tickets.sql`.

## Safety

- No real bank notification was processed.
- Android still does not confirm payments.
- No public webhook semantics changed.
- No auto-confirmation, SMS, Accessibility, scraping, broad enumeration or LLM payment decision was added.
- Android no longer displays raw show-once API/webhook secrets.
- Google linking is backend-owned through `googleLink`; login recovery remains the only place that calls `googleExchange`.

## Validation

- `npm run android:doctor`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 75 files and 535 tests.
- `npm run build`: passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`: passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`: passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleStaging --no-daemon --stacktrace --max-workers=1`: passed.
- ADB device smoke on `SM_S916B`: staging APK installed, launched and UIAutomator dumped the active premium UI.

## Blockers

- None for this sub-screen sprint.
- Follow-up debt: migrate the rest of the older hardcoded Compose strings into full Android resources when doing a dedicated localization pass.

## Next recommended sprint

Run a physical-device walkthrough of:

1. login language switch;
2. Menu > Centre d'aide;
3. Menu > Contacter le support;
4. Menu > Securite > enable app lock;
5. Menu > Langue;
6. Menu > Apparence;
7. Menu > Mode de confirmation.

Then return to the SwimPay Intelligence test ladder only after this UI pass is accepted.
