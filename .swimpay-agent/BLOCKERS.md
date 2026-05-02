# Blockers

No current critical blockers.

Last checked after Sprint 4C Android emulator smoke preparation: 2026-05-02T21:05:00+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo now has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Android Emulator command is not available under the local SDK.
- No Android Virtual Devices are configured.
- No emulator/device is currently attached through adb.
- Emulator smoke validation could not run live.
- APK install and launch could not be validated live.
- Notification Access flow is documented but not live-validated.
- Receiver registration, heartbeat, synthetic signal upload and outbox retry smoke are prepared but not live-validated.
- Android Keystore, encrypted outbox and WorkManager behavior still need emulator/device validation.
- Production-grade asymmetric receiver device signature verification still needs emulator/device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
