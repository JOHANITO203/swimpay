# CR-2 Runtime Product Truth Report

generated_at: 2026-05-07T15:08:00+03:00

## Executive Result

Sprint CR-2 resolved the two critical runtime blockers from the pre-real-world full code review:

1. Active signal processing no longer auto-confirms in V1.
2. Internal signal/review activity no longer enters the public merchant webhook pipeline.

The runtime now treats high-confidence matching as a merchant-review candidate and adds `manual_confirmation_required_v1`. Public webhook delivery is restricted to final V1 events only.

## Changes

### Signal Runtime Manual-only Gate

- `apps/signal-worker/src/runtime.ts`
  - Replaced the active `autoConfirmSignal` branch with manual review routing.
  - Removed active `autoConfirmSignal` implementation from `SignalRuntimeProcessor`.
  - Removed runtime-created public webhook requests from review and reject paths.
  - Normalized `MATCH_SCORED` runtime/audit decision from `auto_confirmed` to `needs_review`.
  - Added `manual_confirmation_required_v1` reason code.

### Public Webhook Taxonomy

- `apps/job-worker/src/webhooks.ts`
  - Public webhook event type is now only:
    - `payment.confirmed`
    - `payment.rejected`
    - `payment.expired`
  - `createPaymentWebhookEvent` rejects unsupported public event types.
  - Endpoint selection ignores internal/legacy event names.

### Guardrail Tests

Updated and added tests across:

- `apps/signal-worker/src/runtime.test.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `tests/durable-worker-e2e.test.ts`
- `tests/private-beta-review-webhook-rehearsal.test.ts`
- `tests/psp-like-checkout-flow.test.ts`
- `tests/e2e-payment-signal-flow.test.ts`
- `tests/five-bank-shadow-rehearsal.test.ts`

Guardrails now prove:

- no runtime `payment.confirmed` before manual merchant confirmation;
- no public `payment.signal_detected`;
- no public `payment.needs_review`;
- no public `order.expired`;
- review creation remains internal before manual decision;
- synthetic five-bank shadow fixtures do not expect public webhooks.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` — 69 files, 489 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

Targeted tests passed:

- `npx vitest run apps/signal-worker/src/runtime.test.ts`
- `npx vitest run apps/job-worker/src/webhooks.test.ts`
- `npx vitest run tests/durable-worker-e2e.test.ts tests/private-beta-review-webhook-rehearsal.test.ts tests/psp-like-checkout-flow.test.ts`
- `npx vitest run tests/e2e-payment-signal-flow.test.ts tests/five-bank-shadow-rehearsal.test.ts`

Docker live smoke could not run because Docker Desktop's `desktop-linux` pipe was unavailable:

- `docker compose ... build ...` failed on `//./pipe/dockerDesktopLinuxEngine`
- `docker compose ... ps` failed on the same pipe
- `Invoke-WebRequest http://localhost:8080/api-health` could not connect

## Remaining Blockers

- Android Receiver real bank notification runtime remains not validated for real-condition capture.
- Google OAuth live exchange remains untested.
- VPS production-mode staging remains not deployed or validated with external secrets.
- Some historical docs and `.swimpay-agent` reports still describe older semantics as history.
- Dormant repository methods for auto-confirm/webhook delivery remain and should be removed or isolated in a follow-up cleanup.

## Next Recommended Sprint

Sprint CR-3: Android Receiver real-runtime readiness and staging smoke, synthetic-only.

Recommended focus:

- remove/isolate dormant signal runtime auto-confirm repository surface;
- verify Android Receiver Bank Target Lock runtime against exact package probes only;
- validate Notification Access, receiver health and synthetic signal upload through a staging URL;
- keep real notification capture paused until explicit operator consent.

