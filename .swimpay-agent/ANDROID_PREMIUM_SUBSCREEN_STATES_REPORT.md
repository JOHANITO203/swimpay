# Android Premium Sub-screen States Report

generated_at: 2026-05-05T00:00:00+03:00

## Scope

Sprint 7M continued the Android merchant premium frontend work after Sprint 7L.

The goal was to answer the open question: have the states and sub-screens for each Android merchant screen been developed?

This pass stayed frontend-only:

- no backend API changes;
- no payment or review logic changes;
- no real bank notification processing;
- no auto-confirmation;
- no SMS, Accessibility scraping, installed-app enumeration or raw PII exposure.

## Multi-agent Findings

Three read-only agents audited independent areas:

- Receiving methods and bank management: confirmed the premium path needed typed receiving-method rows, safe mutation states and bank management states.
- Receiver health, configuration and settings navigation: confirmed settings rows needed real navigation into premium sub-screens instead of inert menu cards.
- Tests and copy guardrails: confirmed the remaining risks were merchant-facing jargon, SBP wording, mojibake markers, raw receiver identifiers and direct Android webhook behavior.

## Implemented Sub-screens

### Receiving Methods

`PremiumReceivingMethodsStateScreen` now consumes typed `PremiumReceivingMethodsUiState` content instead of string-splitting rows.

Each receiving method row now carries:

- `routeId`;
- title;
- masked subtitle;
- helper text;
- beta badge;
- active/inactive status;
- enabled/recommended flags;
- allowed actions.

Runtime mutation states were added for:

- create receiving method;
- disable receiving method;
- mark method recommended.

Raw card and phone inputs are not retained in the visible mutation state after save.

### Banks

`PremiumBanksStateScreen` was added as a real premium state screen.

It currently exposes frontend-safe bank-management states for the five V1 banks:

- `Activée`;
- `À configurer`;
- `En pause`.

No package name, certificate hash, bank evidence status or production-trust wording is shown.

### Receiver Health

`PremiumReceiverHealthStateScreen` was added.

It renders:

- ready/problem status;
- Notification Access state;
- selected bank count;
- outbox/sync rows;
- safe merchant notice;
- an explicit action to open Android Notification Listener settings when action is required.

No SMS permission, Accessibility service or app-enumeration flow was added.

### Settings Navigation

The premium menu now routes to dedicated typed destinations:

- Receiving methods;
- Banks;
- Receiver health;
- Connected site;
- Configuration test.

Navigation uses `PremiumNavigation.openReceivingMethods()`, `openBanks()`, `openReceiverHealth()`, `openConnectedSite()` and `openConfigurationTest()` so the active route tree is explicit and testable.

## Copy And Encoding Guardrails

Updated Android merchant copy:

- replaced `SBP` merchant-facing receiving-method helper text with simpler transfer-by-number wording;
- removed a stale mojibake marker from `MainActivity`;
- kept safe French copy for unavailable order and state panels.

Tests now guard:

- no merchant-facing SBP wording in the premium catalog/runtime states;
- no forbidden technical jargon in visible premium source text;
- no official bank confirmation claim;
- no raw card, phone or notification text in visible state;
- no webhook secret exposure;
- Android does not directly send developer webhooks.

## Files Changed

Production Android frontend:

- `AndroidMerchantApiWiring.kt`
- `AndroidMerchantUiModels.kt`
- `MainActivity.kt`
- `ui/premium/PremiumDashboardScreens.kt`
- `ui/premium/PremiumMerchantApp.kt`
- `ui/premium/PremiumMerchantRuntime.kt`
- `ui/premium/PremiumNavigationState.kt`

Android tests:

- `AndroidMerchantUiContractTest.kt`
- `AndroidMerchantVisualArchitectureTest.kt`
- `PremiumMerchantRuntimeContractTest.kt`
- `PremiumNavigationStateTest.kt`

Sprint/task docs:

- `tasks/429_android_premium_receiving_method_substates.md`
- `tasks/430_android_premium_bank_management_states.md`
- `tasks/431_android_premium_receiver_health_states.md`
- `tasks/432_android_premium_settings_subscreen_navigation.md`
- `tasks/433_android_premium_copy_and_encoding_guardrails.md`
- `tasks/434_android_premium_7m_validation_report.md`
- `.swimpay-agent/TASK_QUEUE.md`

## Validation

Targeted Android JVM tests passed:

- `PremiumNavigationStateTest`
- `PremiumMerchantRuntimeContractTest`
- `AndroidMerchantVisualArchitectureTest`
- `AndroidMerchantUiContractTest`

The first targeted run failed on a misplaced Compose annotation; this was fixed.
The second targeted run failed because the app did not explicitly use the new navigation helpers; this was fixed.
The latest targeted run passed.

Full validation results:

- `npm run android:doctor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 54 files / 382 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- Android `:app:testDebugUnitTest` passed.
- Android `:app:assembleDebug` passed.
- ADB detected Samsung `SM_S916B` / `R5CWA0FEPZW`.
- APK install and launch passed.
- UIAutomator smoke confirmed the premium menu and the new `Banques` sub-screen render on device with safe labels: `Activée`, `À configurer`, `En pause`.

Live Docker checks are still blocked from this shell:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` failed because `//./pipe/dockerDesktopLinuxEngine` was unavailable.
- `http://localhost:8080/api-health` was unreachable while Docker Desktop's Linux engine pipe was unavailable.

## Recommendation

Continue with a dedicated Sprint 7N for order-detail and deeper merchant operational sub-states after Docker Desktop/live backend validation is recovered.

Do not resume real-notification shadow capture until the Android premium frontend and consent/notification-access UX remain stable on device.
