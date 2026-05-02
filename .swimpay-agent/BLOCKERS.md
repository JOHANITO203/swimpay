# Blockers

No current critical blockers.

Last checked after Sprint 4F device-side network smoke wiring: 2026-05-02T22:09:47+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- Real device `R5CWA0FEPZW` is authorized and usable through adb.
- Compose API health is available at `http://localhost:8080/api-health`; `localhost:3000` is intentionally private in Compose mode.
- Debug outbox smoke is in-memory inside the debug controller; persistent encrypted storage and WorkManager retry need deeper real-device validation.
- The Android status screen still reports backend reachability from static state until live health refresh is wired.
- Android Keystore, encrypted outbox and WorkManager behavior still need deeper real-device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.

