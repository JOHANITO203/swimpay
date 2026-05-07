# Blockers

## CR-1 Full Code Review Before Real-World Testing

- Critical: the active signal runtime can still auto-confirm through the legacy matching path. Evidence: `packages/matching-core/src/index.ts` and `apps/signal-worker/src/runtime.ts`. This must be disabled or removed for V1 before any real signal test.
- Critical: internal review/signal events can still enter the webhook delivery path. Evidence: `apps/signal-worker/src/runtime.ts` requests `payment.signal_detected` / `payment.needs_review`, and `apps/job-worker/src/webhooks.ts` models them as public event types.
- Critical: Android Receiver real bank notification runtime is still synthetic/debug-only. Evidence: `ReceiverBoundaries.kt` accepts only the app package in debug, and `SwimPayNotificationListenerService.kt` only enqueues accepted notifications in debug.
- Critical: Google OAuth remains a fail-closed provider seam; real Google login has not been executed.
- Critical: real VPS production-mode staging has not been deployed or validated with external secrets, HTTPS, migrations and synthetic smoke.
- High: BFF/tenant isolation is not yet applied to all merchant/review/receiving routes; several routes still use `parseMerchantId`.
- High: web merchant forms still use a server-side bearer seam and do not exercise real BFF cookie/CSRF form flow.
- High: merchant/Android UI still contains demo-looking live payment/review data that must not be shown during real-world testing.
- Validation blocker: Docker live smoke could not run in this shell because Docker context `desktop-linux` could not connect to `//./pipe/dockerDesktopLinuxEngine`; `/api-health` was not reachable.

## Sprint 9K Production-mode Staging / VPS Validation

- No critical code blocker introduced.
- Production-mode SDK order creation now rejects `auto_confirm` and `autoConfirm` inputs explicitly.
- Receiver registration and heartbeat now support production BFF active merchant context with CSRF and continue to reject local `Bearer test_*` merchant bearers in production mode.
- Safe production/staging env contract is documented in `docs/PRODUCTION_ENVIRONMENT.md`.
- Staging identity seeding is available through an explicit opt-in synthetic script: `scripts/seed-staging-auth-bff.mjs`.
- Full local validation passed: android doctor, typecheck, lint, full tests, build, Compose config, sequential Compose build/up, service health and `/api-health`.
- Remaining non-critical limitation: Google OAuth token exchange is still a fail-closed provider seam; local credentials are configured but full live OAuth exchange remains Sprint 9L.
- Remaining non-critical limitation: real VPS production-mode staging was not deployed or migrated in this sprint; this requires explicit operator approval and external secret handling.

## Sprint 9J Auth BFF Merchant/Admin Foundation

- No critical code blocker introduced.
- Auth BFF foundation is implemented for human dashboard sessions, merchant memberships, permissions, CSRF, and stored API key verification.
- Developer Integration lifecycle endpoints now prefer authenticated BFF active merchant context and require CSRF for BFF-backed mutations.
- Local `Bearer test_*` merchant fallback remains development-only and is still rejected in production on hardened developer integration and receiver routes.
- `/v1/orders` can resolve production merchant identity from stored hashed `api_keys`.
- Remaining non-critical limitation: Google OAuth is currently a fail-closed provider seam; live Google token exchange requires production OAuth configuration and a follow-up staging sprint.
- Remaining non-critical limitation: not every legacy merchant/review/receiving route has been migrated to BFF permission helpers yet; Sprint 9J establishes the foundation and hardens the developer integration + SDK order boundary first.

## Sprint 9I Live Receiver Validation

- No critical code blocker introduced.
- Docker/Compose live stack is reachable and healthy in local development mode.
- Live Receiver registration now returns a safe 401 for syntactically valid but non-existent local/dev merchant bearers instead of leaking a PostgreSQL foreign-key 500.
- Live Receiver heartbeat smoke passed and returned `bank_targets_missing` with `configure_bank_targets`.
- Live signal upload safety smoke rejected `raw_text_present=true` with `raw_notification_rejected`.
- API Dockerfile now includes `packages/bank-templates` so cache-invalidated API image builds can compile admin imports.
- Remaining limitation: production-only stale/future timestamp live behavior cannot be honestly validated through the current Compose stack because `/api-health` reports API environment `development`.

## Sprint 9H Receiver / Intelligence Production Hardening

- No critical code blocker introduced.
- Receiver registration and heartbeat now reject local `Bearer test_*` merchant bearer fallback in production.
- Receiver heartbeat now derives safe action-required operational states including `notification_access_missing`, `needs_reconnect`, `bank_targets_missing` and `force_review_local`.
- Production signal upload now rejects stale/future `observed_at` envelopes outside server clock tolerance before ingestion.
- Signal upload eligibility now rejects inactive/reconnect/access-missing/bank-target-missing/revoked/suspended/disabled receivers.
- Five-bank synthetic/redacted Payment Intent Gate fixture validation was added.
- Intelligence retention policy hooks were documented in `docs/INTELLIGENCE_RETENTION_POLICY.md`.
- Device QA passed on `R5CWA0FEPZW`: APK install, launch and UIAutomator dump succeeded.
- Docker live validation passed after Docker restart: sequential Compose build/up passed, API, web, signal worker, job worker, Postgres, NATS and Valkey are healthy, proxy is running, and `/api-health` returns database, NATS and Valkey `ok`.
- Non-critical local environment note: keep using `COMPOSE_PARALLEL_LIMIT=1` / sequential Compose builds on this machine to avoid Docker Desktop/BuildKit pressure.

## Sprint 9G Developer Wizard Auth Hardening

- No critical product blocker introduced.
- Developer wizard production mode no longer creates or accepts local `test_*` merchant bearer fallback.
- `/v1/merchant/integration*` routes reject local `Bearer test_*` tokens when API environment is production.
- Developer wizard unavailable/auth-required state disables credential, webhook URL, test webhook and retry actions.
- Receiving-method admin writes now send server-side Authorization and Content-Type headers.
- Remaining non-critical limitation: full merchant session/cookie/CSRF and production API key verification across all merchant endpoints remain Sprint 9H work.
- Docker blocker resolved after restart: sequential Compose build/up passed, services are healthy, `/api-health` returns database, NATS and Valkey `ok`, and `/merchant/developer-integration` returns HTTP 200 through the proxy.

## Sprint 9F Developer Integration Wizard Live UX Wiring

- No critical blocker.
- Remaining limitation: production merchant session/auth hardening is still needed; the web live client uses the current server-side bearer seam.

## Sprint 9E Developer Integration Backend Lifecycle

- No critical product blocker introduced.
- Merchant-scoped developer integration lifecycle endpoints were added under `/v1/merchant/integration`.
- Normal credential reads return masked secret key and masked webhook secret only.
- Secret key and webhook secret creation/rotation use explicit show-once response fields.
- Webhook URL persistence validates HTTPS in production and allows localhost only outside production.
- Merchant delivery history is scoped to public V1 events only: `payment.confirmed`, `payment.rejected`, `payment.expired`.
- Backend-owned webhook test/retry endpoints were added and do not trigger fulfillment.
- Webhook secret material is encrypted for backend-owned signing and hashed for lifecycle/audit checks.
- Remaining non-critical limitation: the existing wizard can still render safe fallback content if backend lifecycle APIs are unavailable.

## Sprint 9D Developer Integration Wizard Production Readiness

- No critical product blocker introduced.
- Merchant-facing Developer Integration Wizard now exists at `/merchant/developer-integration`.
- Wizard is limited to V1 Web and Android integration types.
- Secret key and webhook secret are masked in the UI.
- Web snippets use `@swimpay/node` and server-side order creation/webhook verification.
- Android snippets use `@swimpay/android` and keep checkout opening/return parsing separate from backend order status and webhook handling.
- Public delivery history uses only V1 public events: `payment.confirmed`, `payment.rejected`, `payment.expired`.
- Product truth guardrails protect against secret keys in browser/Android snippets, auto-confirm examples, official bank confirmation claims and public fulfillment from internal signal/review events.
- Remaining non-critical backend lifecycle gap: the wizard is not yet backed by a merchant-scoped credential lifecycle, webhook URL persistence, delivery history or retry endpoint.
- Live Docker validation blocker resolved after Docker recovery and sequential builds.
- `COMPOSE_PARALLEL_LIMIT=1 docker compose ... build ...` passed for the Node images, `docker compose ... up -d --no-build` passed, Compose services are healthy, and `/api-health` returns database, NATS and Valkey `ok`.
- Non-critical local environment note: parallel Compose rebuilds can still destabilize Docker Desktop/BuildKit on this 4 GB Docker engine; use sequential builds for local validation.

## Sprint 9B SDK Web Production Readiness

- No critical product blocker introduced.
- `@swimpay/node` was added under `packages/swimpay-node`.
- SDK Web supports server-side order creation, idempotency, typed errors, raw-body webhook verification and public V1 event parsing.
- SDK public webhook parser accepts only `payment.confirmed`, `payment.rejected` and `payment.expired`.
- SDK rejects public fulfillment parsing for internal signal/review event types.
- Product truth guardrails protect SDK-facing docs/examples from auto-confirmation claims, official bank confirmation claims, unsafe client-side secret snippets and unsafe payment release semantics.
- Docker live validation passed after Docker Desktop was restarted and Compose services were started: Postgres, Valkey, NATS, API, web and proxy are healthy, and `/api-health` reports database, NATS and Valkey `ok`.
- Remaining product follow-up: no separate browser package was created; Sprint 9B uses a safe redirect snippet only.

## Product Truth Cleanup Before SDK

- No critical blocker introduced.
- SDK-facing docs now state public V1 webhooks are post-review or terminal outcomes only.
- `docs/06_API_SPEC.md` no longer contains `auto_confirm` order examples.
- `docs/12_WEBHOOKS.md` no longer documents public `payment.signal_detected` or `payment.needs_review` fulfillment webhooks.
- Guardrail test added for SDK-facing docs.
- Remaining non-critical limitation: broader architecture/history docs still contain future/historical auto-confirmation concepts and need a separate docs taxonomy pass before public documentation release.
- Local Docker live validation is blocked in this shell: Docker Desktop Linux engine pipe is unavailable, and `/api-health` is not reachable.

## Production Readiness Audit Before SDK / Receiver Hardening

- No critical blocker introduced by the audit.
- Audit-only sprint completed without changing backend APIs, payment logic, Android notification processing, contracts or state machines.
- SDK Web is partially ready but no packaged production SDK/helper exists yet.
- SDK Android is missing as a merchant integration helper; the existing Android app is the Receiver, not the merchant SDK.
- Developer Integration Wizard is prototype-level and missing Web/Android-only key/secret/snippet lifecycle.
- Receiver/Intelligence is architecturally aligned after Sprints 8A/8B/8C but still needs production hardening around receiver key lifecycle, real multi-bank validation, retention and stale docs/tests.
- Product truth contradictions remain in docs/tests around auto-confirmation, public `payment.signal_detected` / `payment.needs_review` webhook semantics and old `auto_confirm` examples.
- VPS deployment is plausible for 4 GB RAM but not production-ready until env, HTTPS, backup/restore, migration, monitoring and retention are hardened.
- Validation note: code/build validations passed, Android APK installed/launched on the connected device, but live `/api-health` validation is blocked because Compose services are not running (`docker compose ... ps` returned no services).

## Sprint 8C Durable Intelligence Feedback Persistence

- No critical blocker introduced.
- Sprint 8C closes the previous durable persistence gap for passive Intelligence feedback and unknown-shape monitoring.
- Operator Intelligence monitoring remains read-only.
- Feedback and unknown-shape observations do not create payment reviews, emit payment webhooks, mutate classifier rules, promote bank profiles or auto-confirm orders.
- Durable Intelligence records must remain limited to redacted/safe metadata, shape hashes, masked values, counters, timestamps, relation metadata and reason codes.
- Raw notification title/body/text, raw phone, raw card, SMS content, bank credentials and unredacted buyer PII remain forbidden.
- Safety posture preserved: no LLM in payment decisions, no auto-confirmation, no raw notification text/PII, no runtime rule mutation and no official bank confirmation claim.
- Fresh validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Compose service health, `/api-health`, live feedback persistence endpoint, live unknown-shapes monitoring endpoint and live read-only admin Intelligence endpoints.
- The local Postgres volume predated migration `008`; the additive migration was applied manually with `psql` during validation.
- Device availability was confirmed through local SDK ADB on Samsung `SM_S916B` / `R5CWA0FEPZW`; Android source was not changed in Sprint 8C, so no APK install was required for this backend/web persistence sprint.

## Sprint 8B Payment-Intent-Bound SwimPay Intelligence

- No critical blocker introduced.
- Sprint 8A deterministic/non-LLM/privacy-first Intelligence foundation is preserved.
- Payment Intent Gate now makes active buyer checkout intent mandatory before merchant payment review creation.
- No active payment intent now results in no payment review and no merchant payment webhook for unrelated bank activity.
- Negative categories remain blocked from review creation.
- `Matching 100 %` is merchant review copy only; it still requires manual confirmation.
- `Continuer vers ma banque` arms the receiver through `receiver_armed` and does not confirm payment.
- `J'ai payé` remains non-confirming.
- Buyer source card is modeled only as a recognition hint with encrypted/HMAC/masked/last4 outputs; CVV, expiry, PIN, SMS code and bank password fields are rejected.
- No backend payment confirmation, webhook ownership, notification capture, raw PII policy, SMS/Accessibility guardrail, LLM rule or auto-confirmation rule was weakened.
- Fresh code validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Android JVM tests and Android debug APK build.
- Docker live blocker resolved after Docker restart and Compose service startup: final `docker compose ... ps` shows Postgres, Valkey, NATS, API, web and proxy healthy, and `/api-health` returns HTTP 200 with database, NATS and Valkey `ok`.
- Device smoke blocker resolved after reconnect: `R5CWA0FEPZW` / Samsung `SM_S916B` was detected, APK install passed, app launch passed, and UIAutomator confirmed the premium shell.

## Sprint 8A Deterministic Bank Notification Agent V1

- No critical blocker introduced.
- Intelligence V1 is deterministic, static-profile based and non-LLM.
- Android filters only enabled supported bank targets and does not enumerate installed apps broadly.
- Receiver signal upload accepts only redacted Intelligence V1 metadata and rejects raw notification text or `auto_confirm_allowed=true`.
- Passive feedback and unknown shape monitoring are read-only/supervised and do not mutate classifier rules or promote profiles.
- Real bank notifications were not processed in this sprint.
- Auto-confirmation remains disabled for Intelligence V1 outputs.
- Remaining non-critical limitation: feedback/unknown shape monitoring uses in-memory API storage in the local server foundation; durable storage can be added in a later backend persistence sprint.
- Environment blocker: Docker Desktop Linux engine pipe is unavailable from this shell, so fresh `compose ps` and `/api-health` live checks are blocked even though Compose config validation passed.

## Android Local Merchant State Refinement

- No critical blocker introduced.
- Accueil now derives the `Moyens de réception` card from the existing receiving-routes repository.
- `Moyens de réception` values are now `1 actif`, `N actifs`, `À ajouter` or `Connexion en attente`, instead of the conservative `À vérifier`.
- Ventes now presents an intentional local empty state and does not invent fake live sales/orders.
- No backend APIs, contracts, workers, database, payment logic, review logic, notification capture, webhooks or auto-confirmation behavior were changed.
- Remaining non-critical limitation: if the receiving-method repository is unreachable and no persisted local summary exists, Accueil correctly shows `Connexion en attente`.

## Android Data Hydration

- No critical blocker introduced.
- Android premium screens no longer use generic `Données indisponibles` copy in the active `ui/premium` source.
- Accueil now remains alive from local/system state even when dashboard backend hydration is unavailable.
- Webhook/connected-site state is optional and no longer blocks the rest of the merchant console.
- Backend offline states use merchant-friendly synchronization copy.
- No backend APIs, contracts, workers, database, payment logic, notification capture, webhooks or auto-confirmation behavior were changed.
- Remaining non-critical limitation: Accueil receiving-method count is conservative until a lightweight local/live count is wired.
- Non-critical device QA limitation: `adb devices -l` returned no connected authorized device during this hydration pass, so install/launch/UIAutomator smoke was not run.

## Sprint 7K Android Onboarding Full Implementation

- No critical blocker introduced.
- Android onboarding is now scoped to the active `ui/premium` source of truth.
- Compatible-bank search and bank selection were merged into one faster onboarding step per operator correction.
- Bank Target Lock remains exact-package only for the five V1 supported banks.
- No `QUERY_ALL_PACKAGES`, SMS permission, Accessibility service or broad installed-app enumeration was added.
- Notification Access remains a real Android Notification Listener gate and blocks continuation until enabled.
- Site/application connection is skippable; configuration test adapts to connected vs later configuration.
- Configuration test remains non-confirming and does not emit developer webhooks from Android.
- Real bank notifications were not processed and auto-confirmation remains disabled.

## Sprint 7K Android Premium Merchant Operating Model

- No critical blocker introduced.
- `ui/premium` remains the active Android merchant visual source of truth.
- Bank Target Lock was added with exact supported package probing only.
- No `QUERY_ALL_PACKAGES`, SMS permission, Accessibility service or broad installed-app enumeration was added.
- Premium navigation now covers Accueil, Revue, Ventes, Menu, Mode de confirmation and Sécurité.
- Accueil, Revue, Ventes, Menu, Mode de confirmation and Sécurité were aligned to the premium operating model.
- Mode de confirmation uses `IA` wording and remains display-only; real-bank auto-confirmation remains disabled.
- Android still does not confirm orders directly and does not send developer webhooks directly.
- Android targeted JVM tests passed after setting `ANDROID_HOME` / `ANDROID_SDK_ROOT` to the local SDK path.
- Root validation passed: android doctor, typecheck, lint, tests, build and Compose config.
- Android validation passed: full debug JVM tests and debug APK build.
- Non-critical device blocker: ADB is available, but `adb devices -l` returned no connected authorized device in this shell, so install/launch smoke was not run.

## Sprint 7M Android Premium Sub-screen States

- No critical blocker introduced.
- Receiving methods, banks and Receiver health now have dedicated premium typed state screens.
- Settings menu rows now navigate to typed premium sub-screens instead of inert placeholders.
- Merchant-facing `SBP` wording was removed from Android premium receiving-method UI copy.
- Targeted Android JVM tests for premium navigation/runtime/visual/copy guardrails passed.
- Root code validation passed: android doctor, typecheck, lint, tests, build and Compose config.
- Android validation passed: full JVM tests and debug APK build.
- Real-device smoke passed on Samsung `SM_S916B` / `R5CWA0FEPZW`; UIAutomator confirmed the new `Banques` sub-screen.
- Non-critical environment blocker: Docker Desktop Linux engine pipe is unavailable from this shell, so fresh `compose ps` and `/api-health` live checks could not be completed.

## Sprint 7J Android Frontend Source-of-truth Cleanup

- No critical blocker introduced.
- Legacy Android merchant visual source files have been purged from the active source tree.
- `ui/premium` is now the Android merchant visual source of truth.
- Remaining non-critical follow-up: local empty directory `ui/screens` may still exist on disk but contains no Kotlin source files and is not tracked by git.
- Next recommended sprint is Sprint 7K: typed premium navigation and reusable screen-state foundation.

Current Sprint 7I live-capture gate:

- No current critical blocker for frontend/Android UI validation.
- No current critical blockers.
- Explicit live-capture operator consent has not yet been recorded. `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md` is `pending_explicit_operator_confirmation`.
- This is a hard gate for any real Sberbank notification shadow capture, not a blocker for Android UI, build or repository validation.

Preflight warning:

- Latest local Sberbank package evidence row for `ru.sberbankmobile` is `production_trust_revoked`, not literal `approved_for_review_only`. Bank profile auto-confirm remains `disabled`, and this is safe from an auto-confirm perspective, but live shadow capture should acknowledge the local evidence state before proceeding.

No real Sberbank notification was captured, read, uploaded, parsed or matched.

## Frontend Browser QA

- No critical blocker introduced.
- Browser screenshot QA completed for merchant and buyer checkout screens.
- Non-critical: local Chrome headless on this Windows machine crops requested 360px captures, so reliable mobile evidence was captured with CSS-equivalent 720px screenshots.
- Non-critical: final visual acceptance should still be checked by the user in the real app/browser/device flow.
- Backend APIs, contracts, workers, database, payment logic, Android notification processing, real bank notifications and auto-confirmation were not changed.

## Buyer Checkout UX Realignment

- No critical blocker introduced.
- Non-critical: the desktop QR handoff is a safe visual placeholder; a real QR generator can be added later if it encodes only the checkout session URL and never raw card/phone details.
- Non-critical: buyer checkout browser screenshot QA is recommended to tune spacing on small mobile, tablet and desktop viewports.
- Real bank notifications, backend APIs, contracts, workers, payment logic, database, webhooks and Android notification processing were not changed.

## Frontend Screen Inventory / Realignment

- No critical blocker introduced.
- Non-critical: browser/device screenshot QA is still recommended before calling the visual polish complete.
- Non-critical: several web merchant routes are static/demo renderers and should not be treated as new backend integrations.
- Non-critical: buyer checkout status states are audited as partial visual states and can be polished later without API changes.

## Current Local Backend Validation Blocker

- 2026-05-04T17:36:31+03:00: Docker Desktop is not reachable from this shell.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` failed with `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`.
- `http://localhost:8080/api-health` is unreachable while Docker is down.
- This blocks fresh live backend/API health validation only. Code validation, Android JVM tests, APK build, ADB install and app launch passed.
- Per user instruction, Docker was not restarted or repaired by the agent in this pass.

## Android Premium API Wiring

- Premium Android merchant UI is now connected to the existing Sprint 7F Android merchant repositories through `PremiumMerchantRuntime`.
- Debug builds can use local/dev auth (`Bearer test_<merchant_id>`) for local QA.
- Non-debug builds now use a disconnected merchant session rather than a test bearer token.
- Remaining non-critical limitation: production merchant auth/session handoff remains the next contract/API hardening step.

## Frontend Realignment Notes

- No critical blocker found during the UI refactor.
- Remaining non-critical follow-up: browser screenshot QA is still needed to tune spacing and responsive details against the provided mockups.
- No product/API/security blocker was introduced.

Last checked during Sprint 7F revalidation: 2026-05-04T01:44:42+03:00.

## Resolved Environment Issue

- Docker Desktop/containerd is responding again after local recovery.
- `docker version`, `docker info` and `docker compose version` succeeded.
- Compose config renders successfully.
- Postgres, Valkey, NATS, API, web, proxy, signal worker and job worker are healthy.
- API health through the local proxy returns database, NATS and Valkey as `ok`.
- Sprint 7F live endpoint QA through `http://localhost:8080` passed after applying additive local-volume migrations `006` and `007`.
- Real-device install/launch/UI-tree smoke on `R5CWA0FEPZW` passed.

## Validation Note

- The Compose `swimpay-web` container was unhealthy because its healthcheck called `/health`, while the web app currently serves `/` as the lightweight liveness page.
- Fixed the Compose healthcheck to call `/` instead. This is an infra validation repair, not a product API change.
- The existing Postgres volume predated Sprint 7A/7B migrations; additive migrations `006_checkout_bank_selection.sql` and `007_hybrid_receiving_routes.sql` were applied manually with `psql`.

## Standing Non-critical Limitations

- Global `gradle` is still not available in PATH; use the checked-in Android Gradle wrapper.
- Android SDK path on this machine is `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
- Android Emulator command and AVDs are not configured; real device `R5CWA0FEPZW` is available through adb.
- Real bank notifications remain out of scope until the explicit real-notification shadow consent gate is used.
- Real-bank auto-confirmation remains disabled.

## Sprint 9C Android SDK Helper

- No SDK code critical blocker introduced.
- `@swimpay/android` is source-only in this sprint; Maven/Gradle publication remains a future packaging task.
- Docker live validation blocker resolved after Docker Desktop was restarted.
- Compose services are healthy and `http://localhost:8080/api-health` returns database, NATS and Valkey `ok`.

## Sprint 7J Android Frontend Source-of-truth Cleanup

- No critical blocker introduced.
- `ui/premium` is now the only active Android merchant visual source of truth.
- Legacy `ui/screens` Kotlin files and old mock visual renderer/component/design files were deleted.
- Preserved runtime/API/guardrail files remain in place.
- Validation passed: android doctor, typecheck, lint, tests, build, Compose config, Android JVM tests, Android APK build.
- Real-device smoke passed on Samsung `SM_S916B` / `R5CWA0FEPZW` via SDK ADB transport.
- Remaining non-critical limitation: ADB is not in PATH; use `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`.

## Sprint 7K Android Premium Navigation and State Foundation

- No critical blocker introduced.
- Typed premium routes and tabs were added.
- `PremiumScreenState` and `PremiumStatePanel` were added as frontend-only UI state foundations.
- Validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps, API health, Android JVM tests and Android debug APK build.
- Real-device smoke passed through the connected Samsung device using ADB transport id `3`.
- Backend/API/contracts/payment/review/notification behavior was not changed.
- Remaining non-critical follow-up: current dashboard/review/detail screens still need a full state rollout so preview content is not shown during every non-success condition.

## Sprint 7L Android Premium Screen State Rollout

- No code or Android UI critical blocker introduced.
- Dashboard, review queue, payment detail, orders and menu sub-screens now use typed `PremiumScreenState` surfaces.
- Empty/error/action-required states no longer fall back to preview payment/order data.
- Review action buttons are shown only when a real payment detail content state is available.
- Android review actions remain backend-owned and Android still does not send developer webhooks directly.
- Targeted and full Android JVM tests passed with in-process Kotlin compilation after an initial local JVM native-memory failure.
- Real-device ADB install/launch passed on Samsung `SM_S916B` / `R5CWA0FEPZW`.
- The installed APK mojibake observed through UIAutomator was fixed and revalidated: `Données indisponibles` and `RÉESSAYER` now render correctly.
- Environment blocker: fresh Docker live checks are currently blocked because `//./pipe/dockerDesktopLinuxEngine` is unavailable from this shell. `docker compose ... config` still renders, but `docker compose ... ps` and `http://localhost:8080/api-health` cannot be freshly verified until Docker Desktop is restarted/recovered.
- Remaining non-critical follow-up: banks, Receiver health and order detail remain premium placeholder state screens pending dedicated frontend contracts.
