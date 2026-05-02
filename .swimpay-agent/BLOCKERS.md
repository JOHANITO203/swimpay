# Blockers

No current critical blockers.

Last checked after Phase 4J-B real listener replay: 2026-05-03T00:52:04+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- Real device `R5CWA0FEPZW` is authorized and usable through adb.
- Compose API health is available at `http://localhost:8080/api-health`; `localhost:3000` is intentionally private in Compose mode.
- Outbox persistence now uses an Android Keystore-backed protected adapter on device, but full process-death/reboot WorkManager validation remains future work.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
- After reinstall or `pm clear`, Android Notification Listener Access must be re-enabled manually for SwimPay Receiver before live capture can run. Phase 4J now detects this as `regrant_required_after_reinstall` and blocks Receiver readiness until the OS grant is restored.
- Sprint 4J-B verified live synthetic listener capture on real device after the user re-enabled Notification Listener Access. Real bank package/certificate verification and real bank notifications remain out of scope.
