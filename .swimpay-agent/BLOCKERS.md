# Blockers

No current critical blockers.

Last checked after Sprint 4O production trust policy foundation: 2026-05-03T10:55:00+03:00.

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
- Real bank package/certificate verification and real bank notifications remain out of scope.
