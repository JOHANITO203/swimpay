# Android Merchant Polish Static Data Audit

Date: 2026-05-12

## Scope

Audit of runtime Android Merchant premium surfaces for static, simulated, or misleading data after dashboard chart and sales hydration were already handled.

## Findings

| Item | Classification | Result |
| --- | --- | --- |
| Menu / profil marchand | static_fake, needs_ui_only_fix | Runtime showed static initials `JD` and fake UID `#7114-4466-8301`. Replaced with session-derived display handle and honest fallback. |
| Configuration checklist | static_fake, real_backend_source_exists, local_state_source_exists | Runtime used `MerchantConfigurationChecklist.allReady()`. Replaced with current notification access, enabled receiver banks, receiving methods API, and connected-site state. |
| Receiver Health | static_fake, local_state_source_exists | Runtime invented bank counts/outbox/listener state. Replaced with receiver runtime config, package target state, notification access, and honest unknown/check labels. |
| Détail paiement | static_fake, needs_ui_only_fix | Runtime invented `Signal reçu · Il y a 2 min`. Replaced with backend timestamp labels when present, otherwise `Signal non horodaté`. |
| Revue tabs | static_fake, needs_ui_only_fix | Tabs were visual only. Added local filtering over loaded review list and real counters. |
| Moyens de réception bank list | static_fake, needs_ui_only_fix | Settings had a local hardcoded list. Replaced with shared catalog backed by `BankTargetLock.supportedTargets`. |
| Onboarding réception bank list | static_fake, needs_ui_only_fix | Onboarding duplicated another local bank list. Replaced with the same shared catalog. |
| Developer Integration URL | safe_placeholder, needs_ui_only_fix | Example URL could read like configured runtime. Export now marks missing external URL explicitly and keeps example as example. |
| Mode de confirmation | static_fake, needs_ui_only_fix | Static copy implied assisted/AI mode. Replaced with V1 manual mode copy and no auto-confirmation affordance. |

## Already Fixed Outside This Scope

- Dashboard chart hydration.
- Ventes hydration through `GET /v1/android-merchant/orders`.

## Security Notes

- No payment runtime changed.
- No real notification processing added.
- No webhook semantics changed.
- No auto-confirmation introduced.
