# Secondary Surfaces Hydration Audit

generated_at: 2026-05-06

## Result

Status: mixed.

Android premium merchant surfaces are much healthier after the hydration passes. Web merchant/admin surfaces are still more static/prototype-like.

## Android Premium Surfaces

| Surface | Status | Notes |
| --- | --- | --- |
| Accueil | partially ready | Uses local/system state and receiving-method count fallback. No generic dead state expected. |
| Revue | partially ready | Review queue/detail wiring exists; empty states are merchant-friendly. |
| Ventes | partially ready | Intentional empty/local state exists, but live sales/order summary contract remains future work. |
| Menu | partially ready | Premium navigation and menu shell exist. |
| Moyens de reception | partially ready | Masked-only display and API wiring exist. |
| Site ou application | partially ready | Optional state exists; not allowed to block the rest of app. |
| Mode de confirmation | partially ready | Display-only; must keep IA/future modes non-activating. |
| Securite | prototype | Display-oriented until native/backend security features are implemented. |

## Web Surfaces

| Surface | Status | Notes |
| --- | --- | --- |
| Merchant dashboard/screens | prototype/demo | Static screen renderer exists; not production merchant app. |
| Admin evidence/intelligence screens | partially ready | Useful operator read-only surfaces. |
| Checkout buyer | partially ready | Bank-first flow and intent-bound copy exist, but browser/device QA should remain mandatory. |
| Developer connected site | prototype | Not a full integration wizard. |

## Hydration Risks

- Web server still contains mock checkout/session fallback helpers.
- Android `preview()` models are used as defaults for composable previews and can be mistaken for live data if reused incorrectly.
- Ventes does not yet have a live Android sales/order summary contract.
- Webhook absence should stay optional and must not make dashboard/review/sales appear unavailable.

## Recommendation

Keep Android premium surfaces as the merchant app source of truth. Treat web merchant screens as admin/demo until a separate production web merchant console sprint is planned.

