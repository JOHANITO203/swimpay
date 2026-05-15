# Android Button Wiring Audit

generated_at: 2026-05-15T01:30:00+03:00

## Scope

Audit targeted the active Android Merchant premium runtime screens after the operator reported that visible buttons felt disabled or unbound.

## Root Cause

The shared clickable primitive was present and functional: `premiumTap` delegates to Compose `clickable`.

The defect was orchestration-level wiring:

- `PremiumMainTab.Home` rendered dashboard quick actions and metric cards without navigation callbacks.
- `PremiumMainTab.Receivers` rendered `PremiumReceivingMethodsStateScreen(receivingMethodsState)` without mutation callbacks, so add/edit/delete/default actions resolved to default no-op lambdas.
- `PremiumMainTab.Settings` rendered `PremiumSecurityScreen` through `PremiumSettingsScreen`, but did not pass app-lock or Google-link callbacks, so Google linking from the active settings tab was a no-op.
- Dedicated receiver-health and receiving-method routes showed back arrows that were visual only.

## Classification

- `dashboard_quick_actions`: partially_wired
- `dashboard_metric_cards`: partially_wired
- `receiving_methods_main_tab_actions`: callback_default_noop
- `security_google_link_main_tab`: callback_default_noop
- `security_app_lock_main_tab`: callback_default_noop
- `receiving_methods_back_arrow`: visual_only
- `receiver_health_back_arrow`: visual_only

## Not Root Cause

- No backend/API/payment/webhook/database/receiver runtime change was required.
- No evidence found that the global `premiumTap` component was disabled.
