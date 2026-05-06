# Sprint 9D Developer Integration Wizard Production Readiness

Generated: 2026-05-06T19:55:00+03:00

## Scope

Sprint 9D built the merchant-facing Developer Integration Wizard for Web and Android integrations only.

No backend payment runtime, Android Receiver notification processing, contracts, workers, database, real notification capture, LLM logic, SMS, Accessibility scraping, broad app enumeration or auto-confirmation behavior was changed.

## Inventory Result

Created `.swimpay-agent/DEVELOPER_WIZARD_INVENTORY.md`.

Findings:

- Existing merchant web surfaces were `/merchant/connected-site` and `/merchant/settings`.
- The connected-site page existed but was static and did not provide a production integration wizard.
- Existing backend primitives include Android merchant connected-site status/test endpoints, webhook delivery tables and admin webhook failure inspection.
- Missing production lifecycle pieces remain:
  - merchant developer integration read model;
  - API key lifecycle;
  - public key lifecycle;
  - show-once secret lifecycle;
  - webhook secret generation lifecycle;
  - webhook URL save/update endpoint;
  - merchant-scoped delivery history and retry endpoints.

Sprint 9D therefore implemented a safe web wizard surface and documented lifecycle gaps instead of introducing broad auth or credential behavior.

## Integration Selector

Added `/merchant/developer-integration` with a Web/Android-only selector:

- `Site web`
- `Application Android`

No bot, CRM, Shopify, WordPress or other integration category was added for V1.

## Credentials And Webhook Config

The wizard shows:

- Merchant ID;
- public key;
- masked secret key;
- masked webhook secret;
- webhook URL;
- status;
- last test result;
- test result states.

Secrets are masked and never rendered as raw values. The screen includes the required warnings:

- keep secret keys server-side;
- never place the secret key in an Android application.

Current limitation:

- show-once, regenerate, revoke and persistent webhook URL lifecycle are documented as missing backend follow-ups.

## Web SDK Snippets

Added Web snippets based on `@swimpay/node`:

- install command;
- server-side `SwimPay` client construction;
- `swimpay.orders.create`;
- idempotency key usage;
- checkout URL redirect;
- raw-body webhook verification;
- public V1 events: `payment.confirmed`, `payment.rejected`, `payment.expired`.

The browser snippet redirects only and does not contain a secret key.

## Android SDK Snippets

Added Android snippets based on `@swimpay/android`:

- Android app calls the merchant backend;
- backend returns `checkout_url`;
- Android opens checkout via `SwimPayCheckout.open`;
- Android parses return via `SwimPayCheckout.parseReturnIntent`;
- Android refreshes order status from the merchant backend after return.

The Android snippet does not contain:

- SwimPay secret key;
- Authorization bearer secret;
- webhook handling;
- local fulfillment from return/deep-link;
- bank notification processing.

## Webhook Test And Delivery History

Added merchant-facing webhook configuration/test states and a safe recent-delivery history surface.

History rows use public V1 delivery event types only:

- `payment.confirmed`;
- `payment.rejected`;
- `payment.expired`.

No raw payload, webhook secret, raw card, raw phone or raw notification text is shown.

Current limitation:

- UI is production-safe but not yet backed by a full merchant-scoped delivery-history/retry endpoint.

## Guardrails

Added `apps/web/src/developer-wizard.test.ts`.

Guardrails verify:

- Web and Android are the only V1 integration types;
- credentials and webhook secrets are masked;
- no raw card/phone/notification payload is shown;
- Web snippets use `@swimpay/node`;
- Android snippets use `@swimpay/android`;
- browser/Android snippets do not contain secret keys;
- Android snippets do not handle webhooks, notification listeners or local fulfillment;
- internal `payment.signal_detected` / `payment.needs_review` events are not presented as fulfillment webhooks;
- no auto-confirm examples;
- no official bank confirmation claim;
- `payment.confirmed` is represented as post-manual-confirmation.

## Validation

Targeted TDD validation:

- `npx vitest run apps/web/src/developer-wizard.test.ts` passed with 5 tests.

Full code validation:

- `npm run android:doctor` passed.
- `npm run typecheck` passed after correcting the `IconBubble` tone to a supported value.
- `npm run lint` passed.
- `npm test` passed with 64 files and 449 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.

Live Docker validation:

- After Docker Desktop recovery, `docker version`, `docker compose --env-file .env.example -f infra/docker-compose.yml config` and `docker system df -v` passed.
- The earlier BuildKit metadata error was cleared enough for `docker system df -v` to report normally.
- A parallel Compose rebuild still failed once with a BuildKit `EOF` while exporting multiple Node images under local Docker Desktop memory pressure.
- Rebuilding images sequentially with `COMPOSE_PARALLEL_LIMIT=1` passed:
  - `swimpay-api`;
  - `swimpay-web`;
  - `swimpay-signal-worker`;
  - `swimpay-job-worker`.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` shows Postgres, Valkey, NATS, API, web, signal worker, job worker and proxy healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` passed with database, NATS and Valkey `ok`.

Docker live validation is now passing. Recommended local workaround for this 4 GB Docker Desktop environment: use sequential Compose builds (`COMPOSE_PARALLEL_LIMIT=1`) when rebuilding multiple SwimPay Node images.

## Remaining Gaps

Non-critical implementation follow-ups:

1. Add merchant-scoped integration credentials API/read model.
2. Add show-once secret lifecycle if the product wants first-reveal behavior.
3. Add safe regenerate/revoke flows.
4. Add webhook URL persistence/update endpoint.
5. Add merchant-scoped delivery history and backend-owned retry endpoint.

## Next Recommended Sprint

Sprint 9E: Developer Integration Backend Lifecycle.

Recommended scope:

- merchant integration credential read model;
- safe secret masking/show-once lifecycle;
- webhook URL save/update;
- merchant-scoped delivery history;
- backend-owned webhook test/retry APIs;
- preserve manual-confirm-only public webhook semantics.
