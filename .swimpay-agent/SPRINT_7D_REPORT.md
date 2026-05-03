# Sprint 7D Report - Android Merchant Frontend UX Screens

status: passed
generated_at: 2026-05-03T20:20:00+03:00

## Summary

Sprint 7D implemented the Android merchant/Receiver frontend foundation with simple merchant-facing language, typed screen models, copy guardrails and a real `MainActivity` merchant surface.

This sprint did not process real bank notifications, did not enable auto-confirmation, did not add SMS or Accessibility scraping behavior, did not enumerate installed apps broadly and did not claim official bank confirmation.

## Tasks

- `381_android_merchant_ux_language_contract` - completed
- `382_android_onboarding_frontend_screens` - completed
- `383_android_notification_access_gate` - completed
- `384_android_bank_selection_and_receiving_method_setup` - completed
- `385_android_configuration_test_screen` - completed
- `386_android_merchant_dashboard_screen` - completed
- `387_android_receiving_methods_screen` - completed
- `388_android_review_queue_and_payment_detail` - completed
- `389_android_connected_site_webhook_screen` - completed
- `390_android_receiver_health_and_settings_shell` - completed
- `391_android_api_contracts_and_state_models` - completed
- `392_android_ui_tests_copy_guardrails` - completed
- `393_sprint_7d_closeout_review` - completed

## Onboarding Screens

Added Android merchant UI models and `MainActivity` rendering for:

- welcome;
- phone connection and Notification Access;
- five-bank selection;
- receiving method setup;
- configuration test.

The exact approved French copy is centralized in `AndroidMerchantUiModels.kt` and documented in `docs/ANDROID_MERCHANT_UX_LANGUAGE.md`.

## Notification Access Gate

The merchant gate uses the label `Accès notifications` and exposes:

- `Activé`
- `Action requise`

The CTA opens Android Notification Listener settings through `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`. App notification permission and Notification Listener Access remain separate internally.

## Bank Selection

The merchant bank-selection model shows only:

- Sberbank
- T-Bank
- VTB
- Alfa-Bank
- Gazprombank

It hides package/cert metadata, trust internals and production evidence states. The screen uses the badge `Validation manuelle en bêta`.

## Receiving Methods

The receiving method model supports:

- `card_transfer` as `Carte bancaire`
- `phone_transfer` as `Numéro de téléphone`

Saved method display is masked only, for example:

- `Sberbank · •••• 4821`
- `T-Bank · +7 *** *** 45-67`

Raw card and raw phone are not part of visible saved state.

## Configuration Test

The configuration checklist covers:

- Téléphone connecté
- Banque choisie
- Moyen de réception ajouté
- Site ou application connecté

Success and action-required states use approved merchant copy. Synthetic tests remain non-confirming.

## Dashboard

The dashboard model includes ready/problem states, stat cards, recent detected payments and bottom navigation labels:

- Accueil
- Revue
- Commandes
- Plus

Statuses are restricted to simple merchant labels such as `À vérifier`, `Validé`, `Rejeté` and `En attente`.

## Review Queue And Detail

The review queue and payment detail models render merchant-friendly review copy and translate reason codes to:

- Validation manuelle en bêta
- Référence non visible
- Seul le montant a été reconnu
- Plusieurs paiements similaires
- Banque encore en test

Review action contracts distinguish confirm, signal reject and order reject. Signal reject does not reject the order by default.

## Connected Site

The connected site screen is merchant-friendly by default. Developer event names, event id, signature status and delivery attempts are visible only when developer details mode is explicitly enabled.

## Receiver Health And Settings

The Receiver health model shows phone connection, Notification Access, monitored bank count, outbox health and sync time using simple labels. The settings shell includes Business, Paiements, Développeur, Sécurité and Mode bêta sections. Automation is a non-enabling teaser only.

## API Contracts And Mock Gaps

Created `docs/ANDROID_FRONTEND_API_CONTRACTS.md` and `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md`.

Existing local Android boundaries are used for onboarding and receiver health. Missing merchant dashboard/review/connected-site endpoints are represented as typed frontend contracts with mock repositories.

## Tests

Added `AndroidMerchantUiContractTest.kt` covering:

- exact onboarding copy;
- forbidden jargon guardrails;
- Notification Access gate states;
- five-bank display;
- masked card and phone display;
- configuration, dashboard, receiving methods and health states;
- review reason label translation;
- reject-signal order-scope behavior;
- connected-site developer details boundary;
- API mock gap contracts;
- no SMS, Accessibility or broad package visibility permission.

TDD evidence: the Android JVM test first failed because the Sprint 7D merchant UI classes were missing, then passed after implementation.

## Validation

Validation was run after implementation. See final response for command-by-command results.

## Blockers

No critical blockers.

Non-critical follow-ups:

- Android merchant screens use programmatic native views and mock repositories for some backend data; future sprint should wire authenticated merchant APIs.
- Live device visual QA is recommended before beta rollout.

## Next Recommended Sprint

Sprint 7E - Android merchant API wiring, authenticated review actions and real-device visual QA.
