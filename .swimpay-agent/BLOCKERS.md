# Blockers

No current critical blockers.

Last checked after Sprint 4G persistent outbox and live status hardening: 2026-05-02T23:00:00+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- Real device `R5CWA0FEPZW` is authorized and usable through adb.
- Compose API health is available at `http://localhost:8080/api-health`; `localhost:3000` is intentionally private in Compose mode.
- Debug outbox smoke now persists through a protected SharedPreferences-backed local storage boundary; production-grade encryption still requires Android Keystore-backed storage.
- Android status screen now refreshes live backend reachability through `/api-health` in debug mode.
- Full WorkManager background outbox execution still needs deeper real-device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.

