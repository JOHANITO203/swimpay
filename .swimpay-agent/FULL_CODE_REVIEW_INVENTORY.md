# Full Code Review Inventory

generated_at: 2026-05-07T14:40:00+03:00

Scope: full repository audit before real-world testing. No behavior was modified.

## Repository map

| Area | Classification | Notes |
| --- | --- | --- |
| `apps/api` | partially ready / risky | Core API, auth BFF, checkout, receiver, reviews and integration lifecycle exist. Several merchant/review/Android endpoints still use local `Bearer test_*` seams instead of BFF/API-key/receiver identities. |
| `apps/web` | prototype / risky | Merchant and checkout screens exist, but many merchant screens are static/demo renderers. Developer wizard UI exists, but the web BFF cookie/CSRF boundary is not wired through the web server routes. |
| `apps/android-receiver` TypeScript package | partially ready | Receiver models, outbox, synthetic tests and guardrails exist. Useful as contract/test foundation. |
| `apps/android-receiver/android` | partially ready / blocker for real capture | Premium UI exists. NotificationListener path currently allows only synthetic debug notifications and does not yet process real supported bank targets in non-debug runtime. |
| `apps/signal-worker` | risky / contradictory | Durable signal runtime exists, but still has auto-confirmation and internal public-webhook request paths that contradict manual-confirm-only V1. |
| `apps/job-worker` | risky / contradictory | Webhook delivery loop exists, but public event type still includes internal `payment.signal_detected` and `payment.needs_review`; SDK public parser is safer than worker type. |
| `packages/contracts` | partially ready | Central types cover checkout, payment intent, receiver and webhook disclosure. Still includes `auto_confirmed` states as active enum values. |
| `packages/matching-core` | risky / contradictory | Payment Intent Gate exists and is manual-only, but legacy `evaluateSignalMatch` can still return `auto_confirmed`. |
| `packages/swimpay-node` | production-oriented | Minimal Node SDK is coherent: server-side order creation, idempotency, raw-body webhook verification, public event parser restricted to V1 events. |
| `packages/swimpay-android` | production-oriented source helper | Merchant Android helper is separate from Receiver and does not contain secret/webhook/notification behavior. Publication remains future packaging work. |
| `packages/database/migrations` | partially ready | Ten additive migrations exist. Existing volumes need explicit migration runbook; initial schema still contains auto-confirm columns/states. |
| `docs` | partially ready / contradictory | Recent V1 docs are aligned, but older architecture/schema/runtime docs still contain future/historical auto-confirm and internal webhook concepts. |
| `examples` | partially ready | Web Node example is safe and server-side. Android example is snippet-level. No full external staging E2E exists. |
| `infra/docker-compose.yml` | staging ready / production incomplete | Healthchecks, log rotation and memory limits exist. It uses `.env.example` and HTTP-only local Caddy config, not production env injection/HTTPS. |
| `scripts` | partially ready | Staging seed and smoke scripts exist. No full VPS migration/backup/restore drill script. |
| `tests` | strong local coverage / gaps remain | 97 test files found. Coverage is broad for local/unit/guardrails, but no real VPS OAuth, external webhook endpoint, migration dry-run, or real-device staging backend E2E has run. |
| `.swimpay-agent` reports | historical / noisy | Valuable audit history, but many old reports contain stale terms. Not public source of truth. |

## High-signal inventory result

The codebase is not ready for real-world testing yet. It is close in several package surfaces, but three runtime seams must be reconciled first:

1. Signal runtime must be made truly Payment Intent Gate/manual-confirm-only.
2. Public webhook delivery worker must remove internal signal/review events from the public delivery type path.
3. Android Receiver real bank target listening must be wired from Bank Target Lock rather than debug synthetic notification source only.

