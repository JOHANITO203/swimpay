# Blockers

No current critical blockers.

Last checked after Sprint 4D ADB real-device smoke: 2026-05-02T21:58:00+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- A real device is attached and authorized through adb: `R5CWA0FEPZW`.
- APK install and app launch passed on the real device.
- Notification Access is enabled at Android system level for `com.swimpay.receiver`.
- Local API is not reachable on `localhost:3000`.
- Docker Desktop Linux engine is not running, so the Compose runtime could not be started or checked with `docker compose ps`.
- Receiver registration, heartbeat, synthetic signal upload and outbox retry smoke are still blocked by local backend/runtime availability and missing app-side debug trigger.
- The installed MVP status screen does not yet read live Notification Access state dynamically.
- Android Keystore, encrypted outbox and WorkManager behavior still need deeper real-device validation once backend smoke is wired.
- Production-grade asymmetric receiver device signature verification still needs emulator/device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
