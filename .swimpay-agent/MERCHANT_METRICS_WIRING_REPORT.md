# Merchant Metrics Wiring Report

generated_at: 2026-05-09T02:03:00+03:00

## Scope

Wired the existing Android merchant dashboard and review surfaces to real merchant metrics without redesigning the visual system.

No real bank notifications were processed. No auto-confirmation, webhook semantics or `payment.confirmed` behavior was changed.

## Inventory result

- Reusable UI: active premium Android dashboard cards, existing review list/detail screens and existing compact chart surface.
- Fake/demo values found: main blue card label/value, two shortcut-card rows and the hardcoded compact chart path.
- Backend gap found: no merchant metrics summary/timeseries contract existed.
- Review detail gap found: safe score/timeline data was not included in Android payment detail responses.

## Backend metrics endpoints

Added `apps/api/src/merchant-metrics.ts` and wired:

- `GET /v1/merchant/metrics/summary?range=7d|30d|today`
- `GET /v1/merchant/metrics/timeseries?range=30d&bucket=day`

Metrics derive from persisted orders, review queue rows and webhook deliveries. Merchant scope comes from authenticated merchant context; client-provided `merchant_id` is not accepted.

The Android dashboard summary now also embeds `metrics_summary` and `metrics_timeseries` when the metrics repository is configured.

## Dashboard cards wired

- Main blue card label is now `Paiements confirmés`.
- Main blue card value is the real `confirmed_amount_minor` formatted as RUB, for example `42 500 ₽`.
- The card uses a wallet icon style but makes no wallet/held-funds claim.
- Shortcut cards are now driven by backend/state model:
  - `À confirmer`
  - `Confirmés`
  - `Rejetés`
  - `Expirés`
  - `Échecs`
  - `Taux`

Removed hardcoded dashboard values such as `REJETÉS = 0`, `BANQUES ACTIVES = 5`, `Paiements suivis` and `+12.5%`.

## Chart wired

The existing compact chart surface now consumes backend timeseries points:

- primary line: confirmed amount over time;
- secondary line: confirmation rate over time.

If no timeseries is present, the chart does not draw fake data.

## Review screen metrics

The Android payment detail model now consumes:

- expected amount;
- detected amount;
- score when present;
- reason labels;
- short timeline labels.

Backend payment detail response now exposes safe `score` and timeline labels:

- `Signal reçu`
- `Review créée`

No raw notification text, raw phone, raw card, package data or secrets are exposed.

## Guardrails and tests

Added or updated coverage for:

- backend metrics summary/timeseries with no side effects;
- zero-denominator-safe confirmation rate through repository contract behavior;
- Android main card label `Paiements confirmés`;
- no `Paiement suivi` / `Paiements suivis` / `+12.5%` dashboard copy;
- no hardcoded shortcut values for rejected/bank-active cards;
- Android metrics and chart state coming from backend payloads;
- review detail safe score/timeline consumption;
- no public `official_bank_confirmation=true`;
- no raw notification/card/phone/secrets in tested Android merchant responses.

## Commands run

- `npm run android:doctor` - passed.
- `npm run typecheck` - failed once on a test-only `ApiServerOptions` cast, then passed after typing the fake metrics repository.
- `npm run lint` - passed.
- `npm test` - passed, 75 files and 536 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - passed.

## Blockers

- No metrics-specific code blocker remains locally.
- Commit was not created automatically because the working tree contains previous Android settings/subscreen changes alongside this sprint; committing all files would mix scopes.
- Real bank notification testing remains gated by the existing synthetic proof ladder and explicit operator start command.

## Next recommended sprint

Run a device visual smoke on the installed APK for:

1. Accueil dashboard card values and compact chart;
2. Revue payment detail score/timeline;
3. receiving-method active state;
4. SDK order + hosted checkout + manual review + final-only webhook rehearsal.

Keep real notification capture disabled until synthetic SDK/webhook proof passes.
