# Project Structure Audit

Date: 2026-05-04
Scope: audit only. No files were moved, renamed, refactored, or rewired.

## A. Current Folder Tree Summary

### Top-level tree

```text
.
- .git/
- .idea/
- .obsidian/
- .swimpay-agent/
- adr/
- apps/
- docs/
- infra/
- node_modules/
- packages/
- scripts/
- swimpay_bank_templates_pack/
- tasks/
- tests/
- .env.example
- .env.production.example
- .gitattributes
- .gitignore
- AGENTS.md
- CODEX_START_HERE.md
- CONTRIBUTING.md
- MANIFEST.md
- OBSIDIAN.md
- package.json
- package-lock.json
- README.md
- SECURITY.md
- tsconfig.base.json
- tsconfig.json
- tsconfig.test.json
- vitest.config.ts
```

The root `package.json` uses npm workspaces:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

### apps/ tree

```text
apps/
- android-receiver/
  - android/
  - src/
  - package.json
  - tsconfig.json
- api/
  - src/
  - Dockerfile
  - package.json
  - tsconfig.json
- job-worker/
  - src/
  - Dockerfile
  - package.json
  - tsconfig.json
- signal-worker/
  - src/
  - Dockerfile
  - package.json
  - tsconfig.json
- web/
  - src/
  - Dockerfile
  - package.json
  - tsconfig.json
```

### apps/android-receiver tree

```text
apps/android-receiver/
- android/
  - app/
    - build.gradle.kts
    - src/
      - main/
        - AndroidManifest.xml
        - java/com/swimpay/receiver/
          - MainActivity.kt
          - AndroidMerchantApiWiring.kt
          - AndroidMerchantUiModels.kt
          - SwimPayNotificationListenerService.kt
          - outbox/
          - security/
          - work/
          - additional receiver, diagnostics, evidence, privacy and debug helper classes
      - debug/
        - AndroidManifest.xml
        - res/xml/network_security_config.xml
      - test/
        - java/com/swimpay/receiver/
  - build.gradle.kts
  - settings.gradle.kts
  - gradle.properties
  - gradlew
  - gradlew.bat
  - gradle/wrapper/
- src/
  - index.ts
  - *.test.ts
- package.json
- tsconfig.json
```

`src/androidTest` is not present. That is acceptable for a unit-test-heavy beta app, but it should be added before relying on automated real-device UI or permission regression coverage.

### apps/web tree

```text
apps/web/
- src/
  - index.ts
  - checkout.test.ts
  - evidence-admin.test.ts
  - ui/
    - Components.ts
    - Theme.ts
    - *.test.ts
- Dockerfile
- package.json
- tsconfig.json
```

The web app is separated from the API app, but `src/index.ts` currently combines server setup, route handlers, proxying, HTML rendering and checkout/admin flows.

### apps/api tree

```text
apps/api/
- src/
  - server.ts
  - orders.ts
  - payment-sessions.ts
  - receiver-devices.ts
  - signals.ts
  - reviews.ts
  - bank-evidence.ts
  - admin.ts
  - android-merchant.test.ts
  - other focused test files
- Dockerfile
- package.json
- tsconfig.json
```

The API has separate domain files, but `server.ts` remains the central large route/composition file.

### packages tree

```text
packages/
- bank-templates/
  - banks/
    - alfa/
    - gazprombank/
    - sberbank/
    - tbank/
    - vtb/
  - fixtures/
  - policies/
  - schemas/
  - src/
  - tests/
- contracts/
  - src/index.ts
  - src/*.test.ts
- database/
  - migrations/
  - src/
- events/
  - src/index.ts
- matching-core/
  - src/
- observability/
  - src/
- risk-core/
  - src/
- security/
  - src/
- shared-utils/
  - src/
```

### tests/docs/task organization

```text
tests/
- root-level integration, rehearsal, durability and product-safety tests

docs/
- architecture, Android, evidence, checkout, private beta and security docs

tasks/
- flat sprint task archive, currently hundreds of task markdown files

.swimpay-agent/
- sprint reports, task queue, blockers, next action, progress log and agent state docs
```

The docs and tasks are useful, but both are now large flat archives. They are acceptable for the current phase and should be grouped later.

## B. Architecture Diagnosis

| Area | Diagnosis | Notes |
| --- | --- | --- |
| `apps/api` | needs refactor | Domain modules exist, but `server.ts` is too large and route composition is centralized. Safe for beta, not clean enough for long-term production maintenance. |
| `apps/web` | needs refactor | Web code is separate from API, but `src/index.ts` mixes Fastify setup, routes, backend proxying and HTML rendering. Current lint failures are concentrated here. |
| `apps/android-receiver` | acceptable, needs refactor soon | Real Android Gradle app exists and is native enough to run. UI/API/model files are too flat and monolithic. Debug-only tooling is partially separated, but some debug classes still live in main source. |
| `apps/signal-worker` | acceptable | Worker boundary is clear. `runtime.ts` is large and should eventually split into ingestion, matching orchestration, review routing and audit helpers. |
| `apps/job-worker` | acceptable | Worker boundary is clear. Webhook runtime is large but still in the right deployable. |
| `packages/contracts` | needs refactor | Shared contract package is the correct home, but `src/index.ts` is a large single export surface. Split by domain later. |
| `packages/bank-templates` | clean | Bank-specific folders, fixtures, policies and schemas are well separated. |
| `packages/matching-core` | clean | Small focused deterministic matching package. |
| `packages/security` | clean | Focused shared security helpers. |
| `tests` | acceptable | Tests are outside app source and cover many flows, but root-level flat organization is becoming hard to scan. |
| `docs` | acceptable | Docs are extensive and useful. Needs domain folders soon for navigation. |
| `tasks` | acceptable | Task files are traceable, but the flat archive is large and should eventually be grouped by phase/sprint. |
| `infra` | clean | Compose, service Dockerfiles and infrastructure config are separated from source. |

Overall diagnosis: the monorepo is usable and mostly separated by deployable/service/package, but several important files have grown into feature hubs. It is not a single monolith, but it is at the point where controlled structural cleanup is recommended.

## C. Android-specific Diagnosis

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| Android Gradle project root | clean | `apps/android-receiver/android` contains Gradle wrapper, root build files and settings. |
| App module | clean | `apps/android-receiver/android/app` exists with `build.gradle.kts`. |
| AndroidManifest | clean | Main manifest exists under `app/src/main/AndroidManifest.xml`. Debug manifest exists under `app/src/debug/AndroidManifest.xml`. |
| `src/main` | clean | Present. |
| `src/debug` | acceptable | Present and contains debug manifest/network security config. Debug support is not fully isolated because several debug helper classes still live in main source. |
| `src/test` | clean | Present with JVM tests. |
| `src/androidTest` | needs refactor | Not present. Add later for permission, onboarding and real-device smoke automation. |
| Package namespace consistency | clean | Kotlin packages use `com.swimpay.receiver` and subpackages. Gradle namespace/applicationId are `com.swimpay.receiver`. |
| UI layer separated from receiver/listener layer | needs refactor | `MainActivity.kt`, `AndroidMerchantUiModels.kt`, listener, diagnostics and repositories largely share the root package. UI should move under `ui/*`, domain models under `domain/*`, listener/runtime under `listener`/`pipeline`. |
| Network layer separated | needs refactor | `AndroidMerchantApiWiring.kt` mixes auth, transport, repositories, JSON parsing, mock repositories and UI mapping. |
| Outbox layer separated | clean | `outbox/` package exists. |
| Security/keystore layer separated | clean | `security/` package exists. |
| Diagnostics layer separated | acceptable | Diagnostics files exist, but mostly in root package. Move to `diagnostics/` later. |
| Debug-only tools separated from release code | needs refactor | Debug manifest is separated, but classes like `DebugBackendConfig`, `DebugReceiverHttpClient`, `DebugReceiverSmokeController` and synthetic/debug helpers should move under `src/debug/java` or a debug-specific package where possible. |
| No SMS scraping introduced | clean | No `READ_SMS`, `RECEIVE_SMS` or `SEND_SMS` permissions found. |
| No Accessibility scraping introduced | clean | No `BIND_ACCESSIBILITY_SERVICE` or accessibility service declaration found. |
| No broad app enumeration introduced | clean | No `QUERY_ALL_PACKAGES`, `getInstalledPackages` or `getInstalledApplications` path found in Android source. |
| No raw PII logging found | acceptable | Logs are mostly safe-status logs. Existing guard checks reject raw phone/raw notification fields in storage/upload paths. Continue static checks. |

Android diagnosis: the Android Receiver is structured like a real Android app at the Gradle/project level. The risk is not that it is non-Android-native; the risk is that UI, API wiring, state models and debug helpers are too concentrated in a small number of root-package files.

## D. Monolithic File Detection

| Path | Size | Why risky | Suggested future split |
| --- | ---: | --- | --- |
| `apps/api/src/server.ts` | 2880 lines | Central route/app composition file; high merge conflict and route ownership risk. | Split into `app.ts`, `routes/*`, `plugins/*`, `auth/*`, `health/*`. |
| `apps/signal-worker/src/runtime.ts` | 1356 lines | Runtime orchestration, decision routing and persistence concerns are dense. | Split into `ingestion`, `matching-orchestrator`, `review-routing`, `audit`, `shadow-prediction`. |
| `packages/contracts/src/index.ts` | 1185 lines | Single contract surface makes ownership and generated docs harder. | Split into `checkout.ts`, `orders.ts`, `reviews.ts`, `receiver.ts`, `webhooks.ts`, `bankEvidence.ts`. |
| `apps/api/src/orders.ts` | 1161 lines | Order state and API concerns are dense. | Split route handlers, state transitions, validation and persistence helpers. |
| `apps/android-receiver/src/index.ts` | 1123 lines | TypeScript receiver/prototype logic lives beside native Android app and duplicates concepts. | Move true shared contracts to `packages/contracts`; keep only test harness or retire after Kotlin parity. |
| `apps/api/src/bank-evidence.ts` | 1083 lines | Evidence intake, admin review, trust policy and audit behavior are tightly packed. | Split `intake`, `adminReview`, `trustTransitions`, `audit`, `dto`. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt` | 970 lines | Auth, transport, repositories, DTO parsing, mock repositories and UI mapping in one file. | Split into `network/AndroidMerchantApiClient.kt`, `auth/`, `repository/*`, `dto/*`, `mock/*`. |
| `tests/durable-worker-e2e.test.ts` | 946 lines | E2E coverage is valuable but hard to isolate failures. | Split by worker behavior: NATS durable flow, webhook retry, outbox replay, failure modes. |
| `apps/job-worker/src/webhooks.ts` | 936 lines | Webhook delivery, retry, payload construction and persistence are central. | Split payload building, signing, delivery, retry scheduling and audit. |
| `apps/api/src/reviews.ts` | 929 lines | Review queue API/action logic is dense. | Split list/detail/action handlers and review decision service. |
| `apps/api/src/admin.ts` | 920 lines | Admin auth, RBAC, views and mutation logic are in one large module. | Split auth/RBAC, dashboard DTOs, evidence admin and operator management. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantUiModels.kt` | 659 lines | UI copy, state models, mock screen catalog and frontend contracts share one file. | Split into `ui/copy/MerchantCopy.kt`, `ui/model/*`, `domain/*`, `fixtures/*`. |
| `apps/web/src/index.ts` | 545 lines | Web server, HTML rendering and proxy logic are mixed. | Split `server.ts`, `routes/checkout.ts`, `routes/admin.ts`, `views/*`, `apiClient.ts`. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt` | 405 lines | Programmatic UI/navigation in one activity will grow quickly. | Split screens/components/view models; keep activity as navigation shell. |

No refactor was performed in this audit.

## E. Misplaced Code Detection

| Finding | Diagnosis | Recommendation |
| --- | --- | --- |
| `swimpay_bank_templates_pack/` top-level archive | risky | Appears to duplicate or package bank-template/docs/task material outside the active workspace structure. Decide whether it is an archive, fixture pack or obsolete generated pack; move/archive/remove later with approval. |
| `.idea/` tracked in git | risky | IDE workspace state is currently tracked, including cache/workspace files. This is not production-monorepo clean. Untrack later with explicit approval and update `.gitignore` policy if needed. |
| `.obsidian/` tracked in git | acceptable/risky | May be intentional docs workspace. Personal workspace files should be reviewed before team use. |
| `apps/android-receiver/src/index.ts` TypeScript receiver core | needs refactor | Not misplaced Android code in web/API, but it is a parallel receiver implementation beside native Android. Clarify whether it is a contract/test harness; move reusable logic to packages only when needed. |
| Android debug helper classes in main source set | needs refactor | Debug manifests are separated, but debug helper code should be isolated under `src/debug` or guarded more explicitly. |
| Web UI in backend/API | clean | No meaningful web UI rendering was found in `apps/api/src`. |
| Android implementation in web/API | clean | Android package/cert references in API are evidence metadata and tests, not Android platform implementation. |
| Domain logic duplicated across apps | acceptable/risky | Some receiver/review/checkout domain concepts exist in API, Android TS harness and Kotlin UI models. Shared public contracts belong in `packages/contracts`, but not all app-specific state should be shared. |
| Tests in wrong folder | acceptable | Tests are in app/package folders and root `tests/`. Root integration tests are acceptable but should be grouped later. |
| Docs mixed with source | clean | Docs are mostly in `docs/`, `.swimpay-agent/` and `tasks/`, not inside source folders. |

## F. Proposed Target Structure

### Android Receiver target

```text
apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/
- app/
  - MainActivity.kt
  - navigation/
- ui/
  - components/
  - onboarding/
  - dashboard/
  - receivingmethods/
  - review/
  - connectedsite/
  - health/
  - settings/
  - copy/
- domain/
  - onboarding/
  - banks/
  - receivingmethods/
  - reviews/
  - receiverhealth/
- network/
  - AndroidMerchantApiClient.kt
  - dto/
  - auth/
- repository/
  - ReceivingMethodsRepository.kt
  - ReviewRepository.kt
  - DashboardRepository.kt
  - ConnectedSiteRepository.kt
- listener/
- pipeline/
- privacy/
- outbox/
- security/
- diagnostics/
- evidence/
- work/

apps/android-receiver/android/app/src/debug/java/com/swimpay/receiver/debug/
- DebugBackendConfig.kt
- DebugReceiverSmokeController.kt
- DebugSyntheticTools.kt

apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/
- unit tests matching package structure

apps/android-receiver/android/app/src/androidTest/java/com/swimpay/receiver/
- onboarding, permission and smoke instrumentation tests
```

### Web app target

```text
apps/web/src/
- server.ts
- routes/
  - checkout.ts
  - admin.ts
  - merchant.ts
- views/
  - checkout/
  - admin/
  - merchant/
- ui/
  - components/
  - theme/
- api/
  - apiClient.ts
  - dto.ts
- safety/
  - wordingGuard.ts
```

### Backend API target

```text
apps/api/src/
- app.ts
- server.ts
- routes/
  - orders.ts
  - checkout.ts
  - reviews.ts
  - receiverDevices.ts
  - bankEvidence.ts
  - androidMerchant.ts
  - admin/
- services/
  - orderStateMachine.ts
  - reviewService.ts
  - bankEvidenceService.ts
  - receivingRoutesService.ts
  - webhookService.ts
- persistence/
  - repositories/
  - transactions/
- auth/
- audit/
- dto/
```

### Workers target

```text
apps/signal-worker/src/
- consumers/
- runtime/
- matching/
- review-routing/
- audit/

apps/job-worker/src/
- consumers/
- webhooks/
  - payloads.ts
  - signing.ts
  - delivery.ts
  - retry.ts
  - audit.ts
```

### Shared packages target

```text
packages/contracts/src/
- checkout.ts
- orders.ts
- paymentSessions.ts
- reviews.ts
- receiver.ts
- webhooks.ts
- bankEvidence.ts
- androidMerchant.ts

packages/matching-core/src/
- parserInputs.ts
- decision.ts
- reasonCodes.ts

packages/security/src/
- hmac.ts
- masking.ts
- signatures.ts
- encryption.ts

packages/bank-templates/
- keep current bank/fixture/policy layout
```

### Tests target

```text
tests/
- e2e/
- integration/
- rehearsal/
- safety/
- fixtures/
```

### Docs target

```text
docs/
- architecture/
- android/
- checkout/
- bank-evidence/
- private-beta/
- security/
- runbooks/
```

## G. Safe Migration Plan

1. Audit only.
2. Add structure docs and agree on target package/folder boundaries.
3. Split Android UI models/copy/screens first, without changing behavior.
4. Split Android receiver/runtime/listener/network/outbox/debug areas next.
5. Split web features into route/view/API-client modules.
6. Move shared logic to packages only when duplication is real and tests prove parity.
7. Update imports in small batches.
8. Run typecheck, lint, tests, build and Android Gradle checks after each small move.

Migration rule: never combine structural moves with behavior changes. The Android app is especially sensitive to Gradle source sets, manifest merging and package namespace changes.

## H. Risk Assessment

Reorganizing too aggressively could break:

- TypeScript path imports and workspace references.
- Gradle source-set discovery and Android manifest merging.
- Android package namespace assumptions.
- JVM unit test package paths.
- Docker build contexts and service Dockerfiles.
- Frontend route URLs and checkout/admin rendering.
- API contract imports across web, API, workers and Android TypeScript harnesses.
- Generated or referenced assets.
- Debug-only manifest/package visibility behavior.
- Tests that rely on file paths or current app module names.

The most dangerous move would be mixing Android package namespace changes with UI/runtime splits. Keep `com.swimpay.receiver` stable.

## I. Recommendation

Reorganization is recommended soon, but not required immediately before the next UI polish pass.

Recommended timing:

- Do not perform a large repo-wide restructure while lint/tests are already failing for unrelated pre-existing reasons.
- Do a small cleanup soon: document target structure, untrack IDE-local files if approved, decide the fate of `swimpay_bank_templates_pack/`.
- Split Android monolithic UI/API files before adding another large Android frontend sprint.
- Split web `src/index.ts` before adding more checkout/admin web UX.
- Keep backend service extraction incremental and test-driven.

Current cleanliness summary:

- Android structure: acceptable, Android-native at project level, but needs refactor soon.
- Web structure: acceptable separation from API, but web internals need refactor.
- Repo structure: acceptable monorepo shape, but not yet production-grade clean.

## Validation Commands

Commands run during this audit:

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | pass | Workspace was clean before this audit report was created. |
| `npm run typecheck` | pass | TypeScript typecheck completed successfully. |
| `npm run lint` | fail | 16 existing lint errors, concentrated in `apps/web/src/index.ts`, `apps/web/src/checkout.test.ts` and `apps/web/src/ui/Components.ts`. Not caused by this audit. |
| `npm test` | fail | Existing failures in readiness/report tests due `.swimpay-agent/BLOCKERS.md` critical blocker state, plus web evidence-admin copy expectation mismatches. Not caused by this audit. |
| `npm run build` | pass | Build completed successfully. |
| `docker compose --env-file .env.example -f infra/docker-compose.yml config` | pass | Compose config rendered successfully. |

No fixes were made because this was explicitly audit-only.
