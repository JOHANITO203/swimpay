# Blockers

No current critical blockers.

Last checked after Sprint 4E backend/live receiver smoke: 2026-05-02T21:34:45+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- A real device is attached and authorized through adb: `R5CWA0FEPZW`.
- Compose API health is available at `http://localhost:8080/api-health`; `localhost:3000` is intentionally private in Compose mode.
- App-side debug smoke actions currently prepare safe UI/model actions only; registration, heartbeat, upload and outbox flush are not yet executed directly by the app.
- Outbox offline/online real-device retry remains blocked until the app-side network/outbox debug controller is wired to storage and WorkManager.
- Android Keystore, encrypted outbox and WorkManager behavior still need deeper real-device validation.
- Production-grade asymmetric receiver device signature verification still needs emulator/device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
