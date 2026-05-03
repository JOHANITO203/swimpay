# Blockers

No current critical blockers.

Last checked after Sprint 6C five-bank review-only synthetic shadow rehearsal: 2026-05-03T15:30:00+03:00.

Resolved during Sprint 4Y retry:

- Docker Desktop/WSL was restarted by the user.
- Docker daemon, Compose service status and API health recovered.
- The persisted signed-token Compose handoff rehearsal executed successfully.
- Evidence `878ddd87-2e69-40b1-9cc7-da15d95a6b0b` ended `production_trust_revoked` with `trusted=false`, `production_trusted_app_metadata=false` and `auto_confirm_enabled=false`.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Gradle is configured with a smaller daemon heap and one worker for this local 7 GB Windows host; this avoids validation-time daemon out-of-memory crashes while Docker is running.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- Real device `R5CWA0FEPZW` is authorized and usable through adb.
- Compose API health is available at `http://localhost:8080/api-health`; `localhost:3000` is intentionally private in Compose mode.
- Outbox persistence now uses an Android Keystore-backed protected adapter on device. Sprint 4K verified persisted outbox recovery across app restart after local backend outage; full autonomous WorkManager behavior after Android force-stop/reboot remains future work.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
- After reinstall or `pm clear`, Android Notification Listener Access must be re-enabled manually for SwimPay Receiver before live capture can run. Phase 4J now detects this as `regrant_required_after_reinstall` and blocks Receiver readiness until the OS grant is restored.
- Sprint 4J-B verified live synthetic listener capture on real device after the user re-enabled Notification Listener Access.
- Sprint 4K verified selected `TO_VERIFY` bank readiness as `ready_review_only`, listener capture after app restart, and offline/online persisted outbox recovery.
- Sprint 4L added PackageManager evidence collection readiness, but did not collect real bank package/cert evidence. Any real package/cert values still require a deliberate operator-controlled dry run and human review.
- Sprint 4M added backend/admin review-only evidence workflow. Approval is limited to `approved_for_review_only` and does not create production trust.
- Sprint 4N rehearsed synthetic real-device evidence submission, admin approve-review-only, rejection and audit trace. The dry run stayed synthetic and review-only.
- Sprint 4O added production trust policy states, owner/admin permission gates, dual-control and revocation. Production trust is metadata-only and still does not enable auto-confirmation.
- Sprint 4P added an explicit package-name dry-run mechanism, but did not collect live real evidence because no operator/user package name was provided.
- Sprint 4Q collected exact PackageManager metadata for operator-selected `ru.sberbankmobile` and approved it as review-only. Android app-side PackageManager lookup initially failed because Android package visibility hid the package from the app.
- Sprint 4R added exact debug/operator manifest visibility for `ru.sberbankmobile`, distinguished `PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED` from package absence and retested app-side evidence submission successfully. This remains debug/operator support only, not production trust.
- Sprint 4S added idempotent duplicate handling, review reason codes, non-destructive deprecation and metadata-only admin filters for evidence review. Review-only evidence, deprecated evidence and duplicate evidence still do not create production trust or auto-confirmation.
- Sprint 4T added a safe evidence review dashboard API and evidence audit trace filters. Dashboard and audit visibility remain redacted, review-only evidence still does not create production trust, and auto-confirmation remains disabled.
- Sprint 4U added `npm run rehearsal:evidence` for local operator dashboard/audit rehearsal and optional production trust guard validation. The local dry run used evidence `f4069615-028b-4329-a136-115495bd058c` and left same-actor approval blocked by dual-control with auto-confirmation disabled.
- Sprint 4V added a read-only `swimpay-web` operator evidence surface at `/admin/evidence-review`. It renders redacted dashboard/audit data only, does not expose full certificate hashes or raw PII, and cannot request/approve/revoke production trust.
- Sprint 4W added `npm run handoff:evidence-trust` for production trust handoff rehearsal. Default mode is non-mutating; full live dual-operator approval requires signed operator tokens or another explicit two-operator local/dev setup because Compose `dev_token` mode represents one dev operator.
- Sprint 4X added `npm run operator:tokens` and `npm run rehearsal:evidence:signed`. The signed-token handoff execution passed in an in-process local API with two signed operators and ended with metadata trust revoked. Compose remains `dev_token` by default; any persisted signed-token Compose drill should be explicit and local-only.
- Sprint 4Y added a local-only signed-token Compose override, `npm run rehearsal:evidence:compose-signed` and an operational playbook. After Docker Desktop/WSL restart, the persisted signed-token Compose drill passed and ended with metadata trust revoked.
- Sprint 4Z added `npm run handoff:evidence-readiness` and `docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md`. The readiness gate is non-mutating and verifies required artifacts, Sprint 4Y status, blocker state, default Compose mode and safety wording.
- Sprint 5A added `npm run operator:identity-readiness` and `docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md`. The readiness gate is non-mutating and verifies the production operator identity lifecycle package plus selected docs, reports, task files and agent status files.
- Sprint 5B added `npm run production:admin-auth-preflight`, `.env.production.example` and `infra/docker-compose.production-admin-auth.override.yml`. The preflight is non-mutating and verifies dev admin auth is rejected for production and committed production examples do not contain admin tokens or HMAC secrets.
- Production operator identity provider/infrastructure is not implemented. Sprints 5A and 5B define policy, readiness checks and production admin-auth preflight only.
- Sprint 6A paused the production/admin hardening chain and created the five-bank MVP validation matrix plus private beta readiness foundation.
- Sprint 6B used operator-authorized, keyword-filtered ADB package discovery only. It found obvious candidates for all five V1 banks and collected exact PackageManager evidence for Tinkoff / T-Bank, VTB, Alfa-Bank and Gazprombank.
- All selected V1 banks now have package evidence in the five-bank matrix. The four Sprint 6B rows are `approved_for_review_only`; Sberbank remains `production_trust_revoked` from the prior local drill. None of this creates production trust or auto-confirmation.
- Sprint 6C rehearsed redacted synthetic review-only notification-signal fixtures for all five V1 banks. Incoming-like and amount-only signals route to review, negative categories never auto-confirm, and webhook disclosure remains `official_bank_confirmation=false` with `confirmation_type=notification_signal`.
- Real bank notifications remain out of scope. No real notification samples are stored or approved, and any real notification shadow run requires explicit future authorization.
