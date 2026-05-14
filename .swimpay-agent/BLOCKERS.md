# Blockers

## Android Merchant Readability Responsive Polish

- No backend/API/payment/webhook/receiver/database/SDK/state-machine blocker introduced.
- Visual freeze remains blocked by operator approval only.
- Device screenshot blocker: Samsung media/status overlays can cover the status bar during ADB captures; app content screenshots must be taken after relaunch/focus check.
## Checkout Receiver_arming Runtime Blocker (2026-05-13)

- Root-cause fixed in code: creation-time arming state moved from order creation to expected-profile transaction.
- Latest staging rehearsal session remained pre-armed with missing route/lease/armed timestamp, so no review was eligible.
- `webhook_endpoints` is now configured for the test merchant, but no final review decision means no webhook delivery row for that session.
- `webhook_events` is not a runtime table in current schema; use `webhook_deliveries` as source of truth.
- Critical blocker: complete a full checkout progression to produce a review, then confirm it to trigger `payment.confirmed`.
- Security blocker: rotate exposed staging tokens/secrets before next E2E rehearsal.

## Checkout Return URL + External Fulfillment Webhook

- Resolved locally: SDK/API `return_url` is now validated, persisted on `orders`, and exposed to the hosted checkout status contract.
- Resolved locally: confirmed checkout uses the stored merchant return URL before native Android/browser fallback.
- Resolved locally: final webhook payloads now include `external_id`, `amount_minor`, `currency` and `status` so the external backend can identify and fulfill the order.
- Resolved locally: no-notification `manual_bank_check` merchant decisions now create final public webhooks after merchant action only.
- Targeted validation passed: order API, payment-session API, hosted checkout, review action and webhook worker tests.
- Staging blocker: apply `022_checkout_return_url_and_webhook_payload.sql`, then redeploy API/web/job-worker.
- Staging blocker: external merchant backend must have webhook URL/secret configured and verify `SwimPay-Signature`.
- Staging blocker: external app/backend must create orders with `return_url`; fulfillment must rely on signed webhook, not the return button.
- Not executed: real bank notification capture, auto-confirmation or public webhook semantic expansion.

## Buyer Checkout Final State Propagation

- Resolved locally: hosted checkout waiting screen now polls `/checkout/:paymentSessionId/status`.
- Resolved locally: API and hosted web checkout status endpoints send `Cache-Control: no-store` and `Pragma: no-cache`.
- Resolved locally: shared buyer-safe contract now exposes `rejected` as an explicit final buyer status.
- Resolved locally: `/v1/checkout/:id/status` maps merchant manual confirmation to `checkout_state=confirmed` and `buyer_safe_status=confirmed`.
- Resolved locally: Android SDK `returnScheme` is now forwarded to hosted checkout and confirmed checkout renders a native app return URL instead of relying on `history.back()`.
- Targeted validation passed: contracts, hosted checkout and payment-session API tests.
- Staging gate: redeploy API/web, open a real external-app checkout URL, confirm the review in Android Merchant, and verify the buyer page reloads to `Paiement confirme`.
- Staging gate: tap `Retourner au marchand` and verify the external Android app receives `merchantapp://swimpay-return?...` then refreshes backend state.
- Not executed: real bank notification capture, auto-confirmation or public webhook semantic changes.

## Visual Quality Gate / Android Premium Design System

- No payment runtime blocker introduced.
- Resolved locally: visual source-of-truth audit completed for Android assets, hosted checkout brand marks and premium UI tokens.
- Resolved locally: `design/ASSET_REGISTRY.md` now defines official Android launcher assets, bank icon scope, generated runtime marks and forbidden duplicate asset rules.
- Resolved locally: premium Android tokens now include centralized elevation, icon sizes, component sizes, tone colors and gradients.
- Resolved locally: static Android visual guardrail tests now prevent unregistered runtime SwimPay/logo resources and verify token primitives exist.
- Resolved locally: Android runtime brand surfaces no longer use generated Material `Water` icons as the SwimPay mark.
- Resolved locally: safe hardcoded button, Google, selected-tone and card-elevation values are now wired to premium tokens with regression tests.
- Resolved locally: Roborazzi Compose screenshot testing is configured for Android Merchant premium surfaces.
- Resolved locally: Android golden baselines are recorded and verified locally.
- Remaining brand blocker: hosted checkout and web dashboard still render distinct generated SwimPay marks; future polish must align them to the official asset registry.
- No real bank notification processing, auto-confirmation, webhook semantic change or payment state change was made.

## Review Action Actor Identity Contract

- No local code validation blocker remains.
- Root cause resolved locally: runtime marker `android_merchant` is no longer treated as a UUID actor id.
- Review actions now preserve traceability with `actor_type`, `actor_source` and `actor_display`.
- Staging blocker: redeploy API/job-worker and apply migration `020_review_action_actor_identity.sql` before trusting online Android review action writes.
- Device validation pending after deployment: re-test `CONFIRMER RECU`, `REJETER LE SIGNAL` and `Rejeter la commande` against staging.
- Not executed: real bank notification capture, auto-confirmation or public webhook semantic changes.

## Merchant Intelligence 7-Sprint Runtime

- Resolved locally: backend heartbeat now exposes typed `receiver_health` for healthy/degraded/offline UI decisions.
- Resolved locally: Android Merchant derives `ReceiverRuntimeState` and shows short action-oriented health copy.
- Resolved locally: live notification listener and active/snoozed/keyed sweeps require active payment intent, receiver armed state, Expected Payment Profile and locked receiving route before extraction.
- Resolved locally: local recent observation buffer is redacted-only, TTL-limited, hash-deduplicated and rejects raw phone/card/raw-notification markers.
- Resolved locally: no-notification fallback review labels are shown as manual bank check/action required.
- Resolved locally: Android local review notification says “Commande à vérifier” and does not imply confirmation.
- Full validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests and Android debug APK build.
- Resolved on device: ADB smoke passed on Samsung `SM_S916B` / `R5CWA0FEPZW`; review list, local `Commande à vérifier` notification, notification channel and Receiver Health screen were verified.
- Resolved locally: Receiver Health degraded-state action copy now names the actual degraded condition instead of asking to enable notifications when access is already `Activé`.
- Staging check: verify `NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true` and `NO_NOTIFICATION_FALLBACK_MIN_SECONDS=120` before controlled checkout fallback rehearsal.
- Not executed: real bank notification capture, auto-confirmation or public webhook semantic changes.

## Checkout External Flow Repair

- Resolved locally: created additive idempotent migration `018_checkout_external_flow_reconciliation.sql` for staging schema reconciliation.
- Resolved locally: deployment guardrail now checks that the reconciliation migration contains current checkout runtime tables and columns.
- Resolved locally: the real staging external merchant app preserves `SwimPayApiError` status/code/details instead of converting setup errors into generic HTTP 500.
- Staging blocker: apply `018_checkout_external_flow_reconciliation.sql` on the VPS after the repo sync.
- Staging blocker: no local staging SDK secret/webhook secret/external app base URL is available, so SDK order creation was not run from this machine.
- Not executed: real bank notification capture, auto-confirmation, public webhook semantic changes or Android receiver runtime capture.

## Merchant Readiness Gate

- Resolved locally: merchants with no active checkout-safe receiving route now report `merchant_setup_status=receiving_method_required`.
- Resolved locally: SDK/API-key order creation returns structured `409 merchant_payment_setup_required` for not-ready merchants.
- Resolved locally: not-ready merchants do not get a payable order, payment session, amount lease, Expected Payment Profile or receiver-armed state.
- Resolved locally: adding an active receiving route changes readiness to `ready_for_manual_payments`; disabling the last active route returns readiness to `receiving_method_required`.
- Resolved locally: Android dashboard shows the action-required receiving-method message.
- Resolved locally: web merchant dashboard and connected-site surfaces show payment unavailable/action-required copy when no active route exists.
- Full validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Docker Compose config, Android JVM tests and Android debug APK build.
- Staging gate: redeploy before re-testing SWIMVPN+ and external SDK order creation.
- Not executed: real bank notification capture, auto-confirmation, public webhook semantic changes or Android receiver runtime capture.

## Checkout Method Availability Hotfix

- Resolved locally: buyer Step 1 now derives visible card/SBP methods from active checkout-safe merchant receiving routes.
- Resolved locally: backend read/status responses expose `available_payment_methods`, `available_routes` and `unavailable_reason`.
- Resolved locally: forced Expected Payment Profile submission for an unsupported method returns `409 no_receiving_route_for_method`.
- Resolved locally: `continue-to-bank` remains blocked unless a compatible active route is selected.
- Resolved locally: method-unavailable fallback now offers `Payer par carte` or `Payer par SBP` when an alternative exists.
- Resolved locally: no-route checkout opens on `Paiement indisponible` without collecting buyer PAN/phone data.
- Full validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Docker Compose config.
- Pending: staging redeploy before re-testing the SWIMVPN+ checkout path on device.
- Not executed: real bank notification capture, Android Receiver runtime changes, auto-confirmation or webhook semantic changes.

## APK Deeplink Discovery Pipeline

- Repo code blocker: none known.
- The APK discovery tool is now external to the SwimPay repo at `D:\Dev\ExternalTools\swimpay-apk-discovery`.
- Repo integration removed: no root npm scripts, no project reference, no in-repo tests and no `tools/apk-discovery` runtime/build path.
- Runtime blocker: static APK discovery is not runtime launcher support.
- Runtime validation still required before using any candidate deeplink in checkout Step 3.
- Certification blocker: no generated entry is certified; all entries remain `experimental` and `runtimeVerified=false`.
- Sandbox rule: APKTool outputs, decoded APK files and experimental bank observations stay outside the repo.

## Previous blockers

## P0-WIRE-1 runtime wiring

- Resolved locally: amount leases are now allocated in the checkout route-selection transaction.
- Resolved locally: active route/method selection uses leased `payable_amount_minor` and persists `reconciliation_delta_minor`.
- Resolved locally: manual confirmation marks active amount leases `used`; merchant rejection releases them.
- Resolved locally: checkout route discovery and selection consume `bank_route_certifications`.
- Resolved locally: package-validation-pending and disabled bank certifications are blocked before signal parsing/review creation.
- Resolved locally: Ozon Bank is operator runtime-verified for selectable/manual-review-only use; auto-confirmation remains disabled.
- Resolved locally: worker idempotency ledger wraps webhook delivery attempts and no-notification fallback creation.
- Full validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, replay, matching, privacy and webhook scripts.
- P0-WIRE-1 code blocker: none known.
- Staging gate: redeploy this commit and verify `https://staging.swimpay.pro/api-health` before SDK/checkout/manual-review/webhook rehearsal.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## Checkout UX Apple-like guided refactor

- Resolved locally: hosted checkout now starts as a guided mobile-first flow instead of a long technical page.
- Resolved locally: card vs phone/SBP sender inputs are method-specific and no longer shown together in the primary flow.
- Resolved locally: instructions prioritize copyable amount, reference, destination and bank/method details.
- Resolved locally: waiting status uses buyer-safe wording and does not imply confirmation from signal detection.
- Resolved locally: browser form posts redirect back into the checkout rather than showing raw JSON.
- Validation passed: targeted web checkout and copy guardrail tests.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Remaining local blocker: none for the web checkout refactor.
- Staging gate: test the refactored checkout on a real `checkout_url` after redeploy.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## Buyer Checkout 4-Step Addendum

- Resolved locally: active notification sweep runs only in active, armed Expected Payment Profile windows and rejects unsupported packages before extraction.
- Resolved locally: local recent sweep buffer stores redacted metadata only and rejects raw text markers.
- Resolved locally: no-notification fallback creates merchant manual review after 120 seconds from `receiver_armed` without confirmation or public webhook.
- Resolved locally: fallback is cancelled by existing review/signal/final states and is idempotent per payment session.
- Resolved locally: manual confirmation after fallback uses `confirmation_type=manual_bank_check` with `official_bank_confirmation=false`.
- Resolved locally: real-world SBP/card fixture variants are parser fixtures only, not universal bank truth and not auto-confirmation.
- Resolved locally: Ozon Bank is integrated through profile/registry as review-only with exact Android package validation pending.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- Remaining blocker before real notification capture: run the synthetic staging SDK/checkout/manual-review/final-webhook rehearsal after redeploy and migration `015_no_notification_fallback_and_ozon_bank.sql`.
- Resolved locally: Ozon Bank package capability is operator runtime-verified; certificate fingerprint remains documented_unknown and auto-confirmation remains disabled.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## HARDEN-REAL-1 quality blockers

- Resolved locally: runtime rejects invalid signatures and untrusted receiver/device/app trust before parsing/review.
- Resolved locally: Payment Intent Gate is applied before merchant review creation; no active intent means no review.
- Resolved locally: backend production mode now fails fast for missing HMAC/encryption secrets and blocks dev bearer shortcuts.
- Resolved locally: SDK order API keys now require explicit scopes; webhook URLs must be HTTPS and cannot target local/private/internal hosts.
- Resolved locally: Android device proof uses an asymmetric Android Keystore boundary; private key remains on device.
- Resolved locally: Android redaction/canonical hashing avoids durable raw notification text inputs.
- Resolved locally: developer export copy is device-unlock gated, show-once, and cleared after copy/navigation.
- Resolved locally: webhook worker recovers stale `delivering` rows after worker crash/timeout.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android staging APK build.
- Local HARDEN-REAL-1 blocker: none remaining.
- Real notification capture remains gated by synthetic SDK/checkout/manual-review/final-webhook proof and an explicit operator capture-start command.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## Android dashboard metrics wiring

- Resolved locally: Android Accueil now displays `Paiements confirmés` with real confirmed amount from backend metrics.
- Resolved locally: dashboard shortcut cards are wired to pending review, confirmed, rejected, expired, failed and confirmation-rate metrics.
- Resolved locally: compact chart consumes backend timeseries and no longer draws fake data when no points exist.
- Resolved locally: Android payment detail can show safe score and short timeline labels.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- Metrics-specific blocker: none remaining locally.
- Commit blocker: working tree contains prior Android settings/subscreen changes alongside this sprint; a single automatic commit would mix scopes.
- Real notification capture remains gated by synthetic SDK/webhook proof and the explicit operator capture-start command.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## Developer Integration Wizard staging flow

- Resolved in code: wizard now exposes an external-app staging env block for SDK/webhook rehearsal values.
- Resolved in code: API key and webhook secret remain show-once on create/rotate and masked on normal reads.
- Resolved in code: Web snippets keep secrets server-side; Android snippets contain no secrets, no webhook handling and no local fulfillment.
- Remaining blocker before SDK/webhook rehearsal: deploy this patch to staging, then copy the show-once API key and webhook secret into the external merchant app env outside chat.
- Remaining blocker before real notification capture: SDK order, hosted checkout route selection, active payment intent, manual review and final-only webhook delivery still need synthetic proof.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## REAL-CAPTURE-2 staging synthetic upload proof rerun

- Resolved again on installed APK: synthetic redacted signed upload to staging passed.
- Evidence: `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=0`.
- Staging API health is reachable and reports database, NATS and Valkey `ok`.
- Remaining blocker before SDK/webhook rehearsal: staging external merchant app values are not available in this shell (`SWIMPAY_STAGING_SECRET_KEY`, `SWIMPAY_STAGING_WEBHOOK_SECRET`, `EXTERNAL_APP_BASE_URL`).
- Remaining blocker before real notification capture: SDK order, checkout route selection, active payment intent, manual review and final-only webhook delivery still need synthetic proof.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## REAL-CAPTURE-2 public checkout session fix

- Resolved in code: hosted buyer checkout routes no longer require a development merchant bearer.
- Resolved in code: public checkout routes now derive merchant scope from `payment_session_id`.
- Resolved in code: web checkout client no longer injects `Authorization: Bearer <checkout merchant id>`.
- Guardrail added: `apps/api/src/payment-sessions.test.ts` proves the buyer flow can call payment-session, receiver-bank, receiving-route, bank-launcher and continue-to-bank endpoints without Authorization.
- Validation passed: android doctor, typecheck, lint, targeted checkout/API/web/worker tests, full Vitest suite, TypeScript build and Compose config.
- Remaining blocker before SDK/webhook staging proof: fix must be pushed and redeployed to staging.
- Remaining blocker before real notification capture: active payment intent, active receiving method, synthetic signed APK upload, merchant manual review and final-only webhook rehearsal still need proof.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## RECEIVER-SIGN-1 staging proof alignment

- Resolved on device: the installed staging APK silently re-registered/aligned the Receiver with the Android Keystore asymmetric public key.
- Evidence: Android logcat reported `registration_fresh=true registered=true message=Receiver aligne avec la cle Android`, then `registration_fresh=true registered=false message=Receiver deja aligne` after reinstall.
- Added: staging-only ADB proof action `com.swimpay.receiver.STAGING_PROOF` runs a redacted synthetic supported-bank snapshot through the non-debug runtime path, encrypted outbox and `/v1/receiver/signals` upload.
- Resolved: after push/redeploy, the staging signed upload passed with `success=true acked=1 failed_retrying=0 status=201 code=none`.
- Fixed: repeated synthetic proof notifications no longer dedupe against stale outbox records because `notification_hash` includes snapshot time while `semantic_hash` remains stable.
- Remaining blocker before real notification capture: active payment intent, active receiving method, manual merchant review and final-only webhook rehearsal still need proof.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## INTEL-TOOLS-1 SwimPay Intelligence readiness matrix

- Completed: tasks 637 through 647 define the SwimPay Intelligence tool-by-tool readiness pass before any real notification capture.
- Completed: `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_READINESS_MATRIX.md` classifies each tool as ready, partial, blocked, not tested or unsafe.
- Ready at code/test level: exact supported-bank gate, redaction pipeline, protected outbox, backend signal ingestion, anti-replay, parser/classifier synthetic fixtures, Payment Intent Gate, manual review, final-only webhooks, SDK guardrails and receiving methods.
- Partial before real capture: Notification Listener Access proof on the installed staging APK, non-debug listener snapshot proof, staging receiver registration/heartbeat, synthetic redacted APK upload and external staging webhook rehearsal.
- Resolved in code: receiver signing now uses Android Keystore asymmetric public-key registration and backend ECDSA verification. Remaining gate: installed staging APK must re-register and prove one synthetic redacted signed upload before real capture.
- Gated: no real bank notification capture starts until bank detection metrics, Notification Listener Access, receiver heartbeat, synthetic redacted upload, active payment intent, receiving method and final webhook rehearsal pass, followed by a final explicit operator capture-start command.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## REAL-CAPTURE-2 Intelligence tool inventory

- Completed: `.swimpay-agent/REAL_CAPTURE_2_INTELLIGENCE_TOOL_INVENTORY.md` records the current tool-by-tool readiness state.
- Resolved vs older inventory: Android non-debug upload is implemented and no longer a fail-safe/no-op.
- Blocked before real notification capture: receiver registration/heartbeat from the installed staging APK still needs staging proof.
- Blocked before real notification capture: synthetic redacted outbox upload from the installed staging APK still needs staging proof.
- Blocked before real notification capture: active payment intent + receiving method + SDK/webhook rehearsal still need proof.
- Resolved in code: current receiver signing no longer uses an app-generated HMAC key for real runtime; staging device proof remains required after reinstall/re-register.
- Gated: no real notification capture starts until tasks 636 through 642 pass and the operator gives the final explicit capture-start command.

## REAL-CAPTURE-2 Intelligence test ladder

- Planned: tasks 635 through 644 define the ordered SwimPay Intelligence test ladder from tool inventory to combined synthetic E2E and final real-notification gate.
- Resolved: Android staging/non-debug Bank Target Lock can now detect exact supported-bank apps; the operator device shows 5 detected supported bank apps.
- Blocked: fresh login/create-account/onboarding still has not been replayed because app data was preserved.
- Blocked: receiver registration/heartbeat needs a dedicated staging proof step.
- Blocked: receiving methods and connected-site/webhook configuration are still action-required before full SDK fulfillment proof.
- Blocked: synthetic signed signal upload from the installed staging APK still needs to be executed and timed.
- Gated: real notification capture has not started and requires all synthetic gates plus a final explicit operator capture-start command.

## REAL-CAPTURE-1 staging APK/device gate

- Resolved: created an installable Android `staging` build type that is installable with debug signing but runs with `isDebuggable=false`.
- Resolved: staging APK builds against `https://staging.swimpay.pro` with the configured Google server client ID.
- Resolved: staging Android build now passes full `lintVitalAnalyzeStaging` after increasing Gradle metaspace.
- Resolved: staging APK installed and launched on the operator Samsung device over ADB Wi-Fi.
- Resolved: staging API health is reachable over HTTPS and reports database, NATS and Valkey `ok`.
- Resolved: clean relaunch produced no SwimPay crash entries in Android crash log buffer.
- Resolved: Android staging/non-debug bank package visibility now declares exact V1 supported-bank package queries in the main manifest; the operator device shows 5 detected supported bank apps.
- Blocked: existing device data opens directly to an existing dashboard, so login/create-account/onboarding was not replayed; clearing app data needs explicit operator approval.
- Blocked: Android dashboard still shows receiving methods to add.
- Blocked: Menu shows connected-site/webhook configuration as action-required, so full SDK/webhook staging fulfillment is not ready from this device state.
- Blocked: signed synthetic signal upload from the installed staging APK was not executed in this pass.
- Gated: real notification capture has not started and still requires a final explicit capture-start command after receiver heartbeat, supported bank target, active payment intent and webhook endpoint are verified.
- Not executed: real bank notification capture, manual review, webhook fulfillment, auto-confirmation, public production deployment, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.

## Staging-prod Android upload hardening

- Resolved: non-debug Android Receiver now has a real safe upload path from encrypted redacted outbox payloads to `/v1/receiver/signals`.
- Resolved: Android upload transport allows HTTPS staging/prod backends and localhost adb-reverse smoke only.
- Resolved: Android upload path rejects raw notification keys, raw phone/card/card-number/PAN keys and `raw_text_present=true` before upload.
- Resolved: Android mobile session can register and heartbeat a receiver without dev bearer or web CSRF, while web BFF session mutations remain CSRF-protected.
- Resolved: backend accepts a signed Android receiver signal after mobile-session receiver registration and does not emit `payment.confirmed` from capture/upload alone.
- Resolved: active admin/operator surfaces now use manual-review readiness vocabulary instead of active `auto_confirm*` capability vocabulary.
- Resolved: main Compose defaults now fail toward staging/prod-safe auth posture instead of silent dev admin/session fallback.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- Remaining blocker before real capture: reinstall/run the APK on the operator device, verify staging receiver registration/heartbeat, then start only one explicitly operator-approved real notification capture.
- Remaining optional cleanup: inert legacy `auto_confirm*` schema/template/fixture strings can be migrated in a dedicated zero-string vocabulary sprint if needed for external audit optics.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.

## INTEL-TRUTH SwimPay Intelligence Source-of-Truth Audit

- Completed: central source truth created at `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_OF_TRUTH.md`.
- Completed: tool boundary map and per-surface audits for Android, backend signal ingestion, runtime/payment intent, learning/monitoring, webhook taxonomy, SDK/integration and admin/operator surfaces.
- Completed: guardrail test added for central source truth, Android boundaries and public webhook taxonomy.
- Fixed: legacy receiver signal payloads now reject nested raw notification, raw phone/card and credential fields before normalization.
- Runtime blocker: none found for active V1 auto-confirmation. Active runtime remains manual-confirmation-only and payment-intent-bound.
- Public webhook blocker: none found. Public worker/SDK remain final-event-only: `payment.confirmed`, `payment.rejected`, `payment.expired`.
- Critical before real notification tests: non-debug Android upload transport remains fail-safe/no-op, so real accepted redacted signals will not yet reach staging backend from the APK.
- Critical before real notification tests: Android real-runtime hashes still use synthetic/debug vocabulary in the coalescing/hash input.
- High before operator-facing real tests: active admin/template vocabulary can still expose `auto_confirm_allowed_by_template` / `autoConfirmStatus`, even though runtime does not auto-confirm.
- Not executed: real bank notification capture, public production deployment, auto-confirmation, LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.

## REAL-1 Real Staging Integration Test

- Prepared: real staging integration inventory, VPS/domain deploy plan, staging secret contract, migration/seed report, Google OAuth report, Android Receiver staging setup report, real capture report, manual review/webhook report, observability report and closeout report.
- Prepared: minimal external merchant staging app under `examples/real-staging-merchant` using `@swimpay/node`, with SDK order creation and verified final webhook fulfillment behavior.
- Local validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests, Android debug APK build and non-notification device install/launch/UI dump.
- Blocked: `staging.swimpay.pro` DNS/HTTPS was not usable from this shell; `/api-health` did not return a staging health response.
- Blocked: no VPS access/session, staging env file, real staging secrets, Google OAuth credentials, staging API key or webhook secret were available in the workspace.
- Blocked: Docker Desktop Linux engine is unavailable locally, so local Compose runtime `ps` could not run.
- Blocked: Android Receiver could not be registered against staging because staging API and credentials were unavailable.
- Not executed: real bank notification capture, manual merchant review and real staging webhook delivery.
- Safety preserved: no real bank notification was captured in this session, no raw notification text was stored/uploaded, no auto-confirmation was enabled and public webhook semantics were not changed.

## CR-4 Android Receiver Real Runtime Readiness

- Resolved: Android Receiver runtime package gating now accepts only explicitly enabled supported bank targets outside debug.
- Resolved: unsupported package notifications are ignored before redaction, outbox or upload scheduling.
- Resolved: listener runtime snapshots now route through the redaction pipeline before outbox enqueue.
- Resolved: runtime outbox enqueue uses redacted payloads with event id, notification hash, semantic hash, local counter, payload hash and signature.
- Resolved: synthetic staging harness proves supported-bank acceptance, unsupported-package ignore, raw-text boundary rejection, redacted envelope creation and no Android-side payment confirmation.
- Resolved: Android guardrails cover SMS, Accessibility, broad package enumeration, raw notification storage/upload, Android-side confirmation behavior, Android-origin fulfillment callbacks and activated-bank-only listener entry.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests, Android debug APK build and non-notification device smoke.
- Remaining blocker before real-world notification tests: explicit operator approval for real bank notification capture is still required and was not provided in this sprint.
- Remaining blocker before production-mode staging: Google OAuth live exchange and VPS staging with external secrets, HTTPS and migrations remain unvalidated.

## CR-3 Product Truth Contradiction Neutralization

- Resolved: active runtime, contracts, checkout status mapping, review queries, public event constants and metrics no longer contain an active `auto_confirmed` V1 decision/state path.
- Resolved: strong matches now route to manual review with `manual_confirmation_required_v1`; no active runtime path emits `payment.confirmed` without merchant manual confirmation.
- Resolved: active docs no longer present public `payment.signal_detected` / `payment.needs_review` fulfillment webhooks.
- Resolved: new guardrail test protects active runtime and docs against reintroducing `autoConfirm(`, `auto_confirmed`, public internal webhooks or a truthy official-bank-confirmation disclosure.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Validation blocker: Docker live smoke could not run because Docker Desktop's Linux engine pipe was unavailable; `/api-health` was unreachable.
- Remaining non-critical vocabulary debt: inert legacy `auto_confirm*` schema/template/config names remain as disabled compatibility fields and guardrail reason codes. They are not active V1 behavior; a dedicated migration is recommended before a zero-string public audit.

## CR-2 Runtime Product Truth Enforcement

- Resolved: active `SignalRuntimeProcessor` no longer auto-confirms V1 signals. Trusted exact matches are routed to manual review with `manual_confirmation_required_v1`.
- Resolved: active signal runtime no longer requests public `payment.signal_detected` or `payment.needs_review` webhooks.
- Resolved: job-worker public webhook taxonomy is restricted to `payment.confirmed`, `payment.rejected` and `payment.expired`.
- Resolved: five-bank synthetic shadow fixtures no longer expect public review/reject webhooks.
- Validation passed for android doctor, typecheck, lint, full tests, build and Compose config.
- Validation blocker: Docker live smoke could not run in this shell because Docker context `desktop-linux` could not connect to `//./pipe/dockerDesktopLinuxEngine`; `/api-health` was not reachable.
- Remaining blocker before real-world testing: Android Receiver real bank notification runtime remains not validated for real-condition capture.
- Remaining blocker before production-mode staging: Google OAuth live exchange and VPS deployment with external secrets remain untested.

## CR-1 Full Code Review Before Real-World Testing

- Resolved by CR-2: the active signal runtime can no longer auto-confirm through the legacy matching path.
- Resolved by CR-2: internal review/signal events no longer enter the public webhook delivery path from active signal runtime, and job-worker rejects unsupported public event types.
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

- Checkout success/failure corrections are local until commit, push and Dokploy redeploy.
- Staging/external SWIMVPN+ checkout smoke still needs to be rerun after deployment.
- Staging DB must contain recent checkout/matching migrations before the online external app flow can be trusted.
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

## Receiving Methods Feature

- No critical product blocker found in the local receiving-method implementation.
- Staging/VPS blocker: apply additive migration `011_receiving_route_hmac_last4.sql` before depending on `/v1/merchant/receiving-methods` create/list responses in staging.
- Real-notification testing remains blocked until the operator explicitly starts a controlled real-notification capture scenario; this sprint did not process real bank notifications.

## Android Developer Integration Wizard

- No critical local blocker remains for the Android/backend Developer Integration Wizard bridge.
- Staging credential generation still requires an authenticated staging merchant/operator action; show-once API keys and webhook secrets must be copied into the external app environment outside chat.
- SDK/webhook rehearsal should wait for Dokploy redeploy of this commit and a fresh staging `/api-health` check.

## Buyer Checkout 4-Step Flow

- No critical local blocker remains for the hosted buyer checkout V1 four-step flow.
- Native Android bank package/deeplink launching is not implemented in this hosted-web sprint; web checkout records a safe fallback launcher result and relies on copy/paste instructions.
- Deeper card/name variant scoring in Payment Intent Gate remains a future matching enhancement; the Expected Payment Profile data is now persisted and carried into signal runtime candidates.
- Real bank notification testing remains out of scope until the explicit real-notification gate is opened.

## Payment Compatibility Pair Refactor

- No critical local blocker remains.
- Staging/online checkout validation requires commit, push and Dokploy redeploy before SWIMVPN+ can observe the new behavior.
- Native Android bank launcher runtime remains outside this refactor.
- Real bank notification testing remains out of scope.

## Android Visual Golden Baselines / Brand Unification

- No critical local blocker found for Roborazzi debug golden baselines.
- Golden coverage currently includes Dashboard, Review list, Review detail, Receiver Health, Moyens de réception, Developer Integration and Mode confirmation.
- Hosted checkout browser screenshot baselines are now automated locally with Chrome headless.
- Web dashboard brand remains intentionally frozen/secondary and still has a separate generated `S` mark.
- No real bank notification testing, payment runtime change, webhook change or auto-confirmation was introduced.

## Route Readiness / Soft Disable

- No critical local blocker remains.
- Staging requires migration `017_receiving_route_readiness_lock.sql` before relying on route lifecycle and lock fields.
- Online SWIMVPN+ validation requires commit, push and Dokploy redeploy.
- Real bank notification testing remains out of scope.

## Payable Amount Intelligence Alignment

- No critical local blocker remains for payable amount matching.
- Online SWIMVPN+ validation requires commit, push and Dokploy redeploy before the external app can observe the corrected matching/review copy.
- Real bank notification testing remains out of scope.

## No-Notification Fallback Runtime Wiring

- Staging/VPS must set:
  - `NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true`
  - `NO_NOTIFICATION_FALLBACK_MIN_SECONDS=120`
  - `NO_NOTIFICATION_FALLBACK_POLL_INTERVAL_MS=30000`
  - `NO_NOTIFICATION_FALLBACK_BATCH_SIZE=25`
- After redeploy, verify `swimpay-job-worker /health` reports `no_notification_fallback.polling_enabled=true`.
- Local Android Gradle validation is partially blocked by host memory pressure: Gradle reaches Android tasks, then JVM exits with native OOM during unit/APK build. Root Node validation passed.
- Real bank notification testing remains out of scope until fallback review creation and Android merchant notification are verified on staging.

## Review Actions + Payment State Machine

- No local validation blocker remains.
- Staging must be redeployed with the API fix before Android Merchant `CONFIRMER REÇU` can succeed online.
- Staging DB must apply `019_review_action_state_machine.sql` for the explicit `receiver_arm_expires_at` column.
- Live staging ADB action success was not claimed before backend redeploy; local tests and APK install/launch passed.
- Real bank notification testing remains out of scope.

## Android Merchant Polish Static Data Cleanup

- No targeted Android Merchant blocker remains.
- Full repository validation passed locally during the visual/Ozon polish bundle.
- Receiver Health can only show exact backend receiver fields once the backend exposes a complete `receiver_health` contract to the app; until then unknown values are shown as `À vérifier` / `À configurer`, not fake values.
- Real bank notification testing remains out of scope.

## Checkout Sender Bank / Receiver Route Contract

- No implementation blocker remains after the targeted contract/UI fix.
- Ozon Bank still uses the documented `OZ` placeholder because no official Ozon logo asset is registered in-repo.
- Staging must be redeployed before SWIMVPN+ can verify sender-bank selection and logos online.
- Real bank notification testing remains out of scope.

## Checkout Micro Details / Late Buyer Claim / Return To Host

- No local implementation blocker remains after targeted checkout tests.
- Full validation and checkout screenshot verification still need to run before final handoff.
- Staging must be redeployed before Android SDK return behavior and late buyer claim reconciliation can be verified online.
- External fulfillment remains webhook-owned; the buyer return CTA is UX-only.

## Validation Status

- Full local validation passed for this checkout sprint.
- Remaining blocker is staging redeploy/online verification only.

## 2026-05-13 - Checkout edit mode removal
- No blocker from checkout edit mode. Runtime edit CTA removed and checkout_edit query ignored in canonical flow.
## Checkout Contradiction Review (Audit-Only, 2026-05-13)

- Critical blocker: sender bank UI source is still `payer_bank_launchers` instead of strict `available_sender_banks` contract.
- Critical blocker: fallback `Retourner au marchand` still depends on `history.back()` when no safe return target exists (safe but non-deterministic in webviews).
- Medium blocker: checkout renderer step resolution still trusts local field combination more than canonical `checkout_state`.
- Medium blocker: logo rendering still has local mapping dependency instead of backend-provided `logo_asset_key` priority.
- Missing test blocker: multi-tab stale checkout reconciliation and external webhook consumer E2E coverage remain incomplete.

## Checkout Contradiction Fix Sprint (2026-05-13)
- Staging blocker: deploy web/api build containing canonical checkout_state renderer and deterministic return fallback route.
- Staging blocker: verify integrators send either android return scheme or safe return_url to avoid fallback page.
- Monitoring blocker: add alert for sessions repeatedly landing on /merchant/return-unavailable to detect integration gaps.

## Android Merchant Visual Gate Delock (2026-05-14)

- No blocker remains for fast Android Merchant design polish validation.
- Roborazzi and legacy design-structure guardrails are manual visual gates now, not default unit-test gates.
- Product/security/payment/runtime guardrails remain active in default Android tests.
- Remaining design blocker: visual fidelity to the provided mockups is still incomplete and must continue screen-by-screen in Design Polish Mode.

## 2026-05-14T01:45:00+03:00 - Visual Gap Blocker
`11_integrations_list.png` now has a numbered Roborazzi capture, but the current tree has no dedicated `PremiumIntegrationsListStateScreen`. It is captured from `PremiumConnectedSiteStateScreen` for now. Create a true integrations-list production component/route before final visual freeze.

## 2026-05-14T12:00:00+03:00 - Android visual blockers
No backend/runtime blockers found for this design-only pass. Remaining blockers are visual/time-scope blockers: each screen still needs direct layout matching to move from partial to close. Screen 11 now has a visual list surface, but it still uses the connected-site UI state instead of a richer integrations-list-specific UI model.

## 2026-05-14T12:45:00+03:00 - Codex skill workflow import

- No blocker introduced by the workflow/tooling integration.
- External repositories were cloned into `.external-skills/` for local audit and are ignored by git.
- No backend, API, database, payment runtime, webhook, receiver runtime, SDK or notification-processing files were changed.
- Existing visual blocker remains: Android screens still need screen-by-screen mockup matching before Visual Freeze Mode.

## Android Merchant Full Visual Rebuild (2026-05-14)

- No backend/runtime blocker introduced.
- Completed local design-only rebuild pass against 14 Android Merchant references.
- Validation passed: `:app:compileDebugKotlin`, `:app:assembleDebug`, device install/launch and live screenshot capture.
- Remaining blocker is design approval only: do not update Roborazzi goldens until the operator approves the visual result.
- Remaining visual-freeze task: capture all 14 final screens and tune exact spacing/density before baseline update.

## 2026-05-14 - Android edge-to-edge shell/splash sprint
- No backend/runtime blockers introduced.
- Visual follow-up: connected phone renders several premium screen texts oversized/wrapped under current device display/font settings.
- Visual follow-up: accented French glyphs appear as replacement characters on captured device screenshots; investigate source encoding/resource rendering separately from shell work.
- QA follow-up: receiver health route was not reached during the quick ADB tab sweep.


## 2026-05-14 - Android text integrity and mojibake fix
- No backend/runtime blocker introduced.
- Remaining UI QA risk: only dashboard was recaptured after the text fix; deeper screens should be spot-checked for screen-specific overflow during the next visual QA pass.

2026-05-14 - No backend/runtime blocker found for layout defect sprint. Residual visual risk: final operator acceptance still required for pixel-level density and card proportions.

2026-05-14 - ADB device disconnected after final staging assemble, so final post-shell-padding screenshots could not be recaptured. Previous manual screenshots exist under .swimpay-agent/screenshots/layout-defect/.
