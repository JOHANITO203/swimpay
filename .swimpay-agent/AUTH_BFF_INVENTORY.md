# Auth BFF Inventory

Generated: 2026-05-07T10:55:00+03:00

## Summary

Sprint 9J started from a partially hardened developer integration boundary:

- `/v1/merchant/integration*` already rejected local `Bearer test_*` merchant tokens in production.
- Developer Integration Wizard UI already rendered safe masked credentials and SDK snippets.
- Receiver registration/heartbeat production routes already rejected local test bearers after Sprint 9H/9I.

Missing production foundation before this sprint:

- no BFF human session/cookie lifecycle;
- no user → merchant membership → role/permission model;
- no active merchant context from authenticated session;
- no CSRF for browser-backed merchant mutations;
- no Google OAuth provider seam;
- no stored-key verification path for SDK order creation in production;
- no additive identity/session database schema;
- admin/operator token auth existed, but there was no user/admin role table boundary.

## Route Boundary Findings

| Surface | Previous boundary | Sprint 9J target |
| --- | --- | --- |
| Developer integration read/mutations | Dev bearer outside production; production rejected local test bearer | BFF session + membership permission, with dev bearer fallback only outside production |
| Developer integration POST/PUT/retry | No browser CSRF boundary | CSRF required when using BFF session |
| `/v1/orders` SDK/API create | Local test bearer | Stored hashed API key in production, dev test bearer only outside production |
| Receiver registration/heartbeat | Hardened in Sprint 9H/9I | Kept separate from BFF and SDK key identity |
| Admin intelligence/operator routes | Existing operator token config | Added admin-role schema foundation, existing operator token boundary preserved |
| Web merchant session | Server-side seam existed for wizard UX | Opaque BFF session foundation added |

## Product Truth Checks

- Payment behavior was not changed.
- `payment.confirmed` webhook semantics were not changed.
- No auto-confirmation, LLM, SMS, Accessibility, bank scraping or broad app enumeration was introduced.
- Receiver device identity, SDK API key identity and BFF human session identity remain separate.

## Remaining Follow-Up

- Full Google OAuth exchange is still a provider seam, not a complete live OAuth flow.
- More merchant dashboard/review/receiving-method routes should be migrated to BFF permission helpers in later hardening passes.
- Production staging must configure real Google OAuth settings and stored API keys before disabling all local auth seams.

