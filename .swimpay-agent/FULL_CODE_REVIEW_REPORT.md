# Full Code Review Report

generated_at: 2026-05-07T14:40:00+03:00

## 1. Executive verdict

SwimPay is not ready for real-world testing yet.

The repository has strong foundations: Auth BFF model, SDKs, Developer Integration Wizard, deterministic Intelligence models, Payment Intent Gate, receiver privacy guardrails and broad local tests. But the active runtime is not fully coherent with final V1 product truth.

The most important blockers are:

1. Signal runtime can still auto-confirm through legacy matching.
2. Internal review/signal events can still be requested through the webhook delivery path.
3. Android Receiver real bank NotificationListener runtime is still synthetic/debug-only.
4. Real Google OAuth exchange and real VPS production-mode staging have not been executed.

## 2. Critical blockers

| ID | Blocker | Evidence | Fix required before real-world testing |
| --- | --- | --- | --- |
| CR-1-C1 | Auto-confirm runtime path still exists. | `packages/matching-core/src/index.ts:21`, `:277-286`, `:477`; `apps/signal-worker/src/runtime.ts:296`, `:338-389`. | Disable/remove active auto-confirm path for V1. |
| CR-1-C2 | Internal events are still treated as public webhook delivery types. | `apps/signal-worker/src/runtime.ts:92`, `:433`, `:459`; `apps/job-worker/src/webhooks.ts:9-14`. | Public delivery type must be final V1 events only. |
| CR-1-C3 | Android Receiver real bank runtime is not wired. | `ReceiverBoundaries.kt:17-19`; `SwimPayNotificationListenerService.kt:31-32`. | Wire enabled Bank Target Lock packages and redacted non-debug enqueue path. |
| CR-1-C4 | Real OAuth flow is not implemented. | `apps/api/src/server.ts:386-414`. | Implement/live-validate Google OAuth or exclude OAuth from real-world scope. |
| CR-1-C5 | Real VPS production-mode staging not executed. | Sprint 9K was local/test guardrails, not external VPS/OAuth/HTTPS. | Run synthetic-only VPS staging with external secrets. |

## 3. High-risk issues

- Merchant/review/receiving-route API routes still use `parseMerchantId` instead of BFF permission helpers.
- Web merchant app still uses a process/server bearer seam and does not forward BFF cookies/CSRF to backend lifecycle routes.
- Merchant and Android UI still contain demo-looking payment/review rows.
- Database schema and older docs still expose active-looking auto-confirm states/columns.
- Compose defaults are development mode and use `.env.example`.
- Existing DB volumes need explicit migration tooling; init scripts are not enough.

## 4. Medium-risk issues

- Some UI copy still uses "Validation" / beta terminology where final UX prefers "Confirmation".
- One-time secret HTML rendering is acceptable only after web BFF/CSRF/HTTPS are fully active.
- Admin web routes are token-client based, not a real human admin session surface.
- 2 GB VPS is staging-only and needs swap/off-box build strategy.
- Older `.swimpay-agent` history and task docs are noisy and contain stale product assumptions.

## 5. Low-risk issues

- SDK publication packaging for Android is still source/snippet level.
- Some docs need UTF-8/copy cleanup before being shown publicly.
- Retention policy exists, but automated cleanup is intentionally not implemented.

## 6. Product truth consistency

Partially aligned.

New public docs and SDKs are aligned. Runtime and older docs/tests are not fully aligned due to auto-confirm and internal webhook event paths.

## 7. Auth / tenant isolation

Partially ready.

Auth BFF foundation is real, but not yet applied everywhere. Developer Integration lifecycle and `/v1/orders` are better protected than review/receiving/Android merchant endpoints.

## 8. Payment / review risks

High.

Payment Intent Gate exists, but the durable signal runtime still uses legacy `evaluateSignalMatch` and can auto-confirm. This must be fixed before live signals.

## 9. Receiver / Intelligence risks

High.

Privacy and deterministic guardrails are strong, but real bank target runtime is not active. Current Android listener is synthetic/debug-only.

## 10. Webhook / SDK risks

High in worker, low in SDK.

`@swimpay/node` public parsing is correct. `apps/job-worker` and `apps/signal-worker` still allow/request internal event delivery.

## 11. Android / UI risks

Medium/high.

The premium UI source is correct, but fake-looking live data and demo identifiers remain in some surfaces. Real receiver capture is not production-ready.

## 12. Database / migration risks

Medium/high.

Migrations are additive, but production migration operations and auto-confirm schema taxonomy need cleanup.

## 13. Security / privacy risks

Medium/high.

No tracked real OAuth secret found. Main security risk is incomplete web BFF/CSRF wiring and public/internal webhook boundary.

## 14. VPS / deployment readiness

Staging-only.

Local Compose works, but VPS production-mode staging needs external secrets, HTTPS/domain/OAuth redirect, migration runbook, backups and synthetic smoke.

## 15. Test coverage gaps

Critical tests still needed:

- runtime cannot auto-confirm in V1;
- runtime cannot request public `payment.signal_detected` / `payment.needs_review`;
- worker cannot deliver internal event types publicly;
- Android non-debug supported-bank target filter/enqueue path;
- real OAuth exchange;
- VPS production-mode synthetic smoke;
- migration dry-run and backup/restore.

## 16. Recommended fix order

1. Runtime product-truth fix: remove active auto-confirm and internal public webhook requests.
2. Webhook worker contract fix: final V1 public events only.
3. API auth migration: move review/receiving/merchant routes to BFF/API-key identities.
4. Web BFF integration: cookie/CSRF forms, no process-global merchant bearer.
5. Android Receiver real target path: enabled supported packages only, non-debug redacted upload.
6. UI demo-data cleanup.
7. VPS synthetic staging run.

## 17. Must fix before real-world testing

- CR-1-C1 through CR-1-C5.
- Route identity and web CSRF gaps for any merchant surface used in testing.
- Demo live-looking data on surfaces shown to real operators.

## 18. Can wait until after staging

- Android SDK Maven publication.
- Automated retention cleanup jobs.
- Advanced monitoring dashboards.
- Public documentation polish beyond blocking contradictions.

## 19. Commands run

- PASS: `npm run android:doctor`.
- PASS: `npm run typecheck`.
- PASS: `npm run lint`.
- PASS: `npm test` (69 test files, 488 tests).
- PASS: `npm run build`.
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config`.
- BLOCKED: `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-signal-worker swimpay-job-worker proxy`.
  - Reason: Docker client context `desktop-linux` could not connect to `//./pipe/dockerDesktopLinuxEngine`; pipe was missing in this shell.
- BLOCKED: `docker compose --env-file .env.example -f infra/docker-compose.yml ps`.
  - Same Docker engine pipe issue.
- BLOCKED: `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`.
  - Reason: no local API/proxy was reachable after Docker engine failure.

## 20. Next sprint recommendation

Sprint CR-2: Runtime product-truth enforcement.

Goal: make the active runtime manual-confirm-only and public-webhook-final-only before any VPS/OAuth/receiver real-world test.
