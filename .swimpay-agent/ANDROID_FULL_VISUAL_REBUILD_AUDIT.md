# Android Full Visual Rebuild Audit

Date: 2026-05-14
Scope: Android Merchant premium UI layer only.

## Source Of Truth

Reference files inspected:

- `design/reference/android-merchant/01_login_welcome.png`
- `design/reference/android-merchant/02_notification_access.png`
- `design/reference/android-merchant/03_bank_selection.png`
- `design/reference/android-merchant/04_receiving_setup.png`
- `design/reference/android-merchant/05_site_app_setup.png`
- `design/reference/android-merchant/06_webhook_test.png`
- `design/reference/android-merchant/07_dashboard_home.png`
- `design/reference/android-merchant/08_review_queue.png`
- `design/reference/android-merchant/09_review_detail.png`
- `design/reference/android-merchant/10_receiving_methods.png`
- `design/reference/android-merchant/11_integrations_list.png`
- `design/reference/android-merchant/12_integration_detail.png`
- `design/reference/android-merchant/13_receiver_health.png`
- `design/reference/android-merchant/14_security_settings.png`

## Visual Mismatch Findings

- The active app still had old-theme residue in account-entry chrome, onboarding cards, dashboard form fields, bank logo containers and several settings sub-surfaces.
- Screen 03 bank rows already had logo/name structure, but the click path blocked non-detected banks visually. Ozon could appear but was not always visually selectable.
- Screen 04 had a visual multi-select draft, but it lacked the mockup-style destination example block tying bank logo, bank name and masked destination together.
- Screen 05 and 06 used the mockup shell but still relied on older card hierarchy.
- Screens 10-14 were mostly dark/glass already, but several shared rows, text fields and nested settings surfaces still showed old component styling.

## Guardrail Check

No backend, API contract, database, payment runtime, webhook runtime, receiver runtime, SDK behavior or state-machine files were changed.
