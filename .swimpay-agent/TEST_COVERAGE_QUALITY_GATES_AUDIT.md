# Test Coverage and Quality Gates Audit

generated_at: 2026-05-07T14:40:00+03:00

## Inventory

97 test files were found across TypeScript/Vitest and Android JVM tests, excluding `node_modules`, `.git`, Android build and Gradle caches.

## Strong coverage areas

- SDK Web order creation, webhook verification and product-truth guardrails.
- Android merchant SDK separation/product-truth guardrails.
- Auth BFF foundation, CSRF, stored API key validation and production-mode guardrails.
- Developer integration lifecycle and wizard safety.
- Receiver contracts, raw notification rejection, duplicate signal protections.
- Android JVM premium UI, onboarding, Bank Target Lock and outbox guardrails.
- Payment Intent Gate unit tests.
- Docker Compose config/live smoke scripts.

## Missing before real-world testing

| Severity | Missing gate | Why it matters |
| --- | --- | --- |
| Critical | Signal runtime manual-only enforcement test | Current runtime still has auto-confirm path and public internal webhook requests. |
| Critical | Public webhook worker event taxonomy test | Worker still accepts old internal public event types. |
| Critical | Real supported-bank Receiver package allowlist test | Android runtime is synthetic debug-only. |
| Critical | Live Google OAuth exchange test | OAuth seam fails closed; real login not validated. |
| High | Web BFF session/CSRF browser form E2E | Web app routes do not pass BFF cookie/CSRF to backend lifecycle. |
| High | VPS production-mode smoke | Sprint 9K was local/test guardrails, not real VPS with external secrets. |
| High | Migration dry-run against existing volume | Existing Docker volumes need explicit migration flow. |
| High | Backup/restore drill | Required before any persistent real-world staging data. |
| Medium | External webhook endpoint staging delivery | Need test against real merchant-like endpoint with verified signature. |
| Medium | Android real-device smoke against staging backend | Current device smoke is local/dev; real staging backend not validated. |
| Medium | Concurrency/load test for order/signal/review/webhook | Needed before merchant pilot. |

## Recommendation

Do not start real-condition testing until critical gates are green. The next sprint should be a fix sprint, not a live validation sprint.

