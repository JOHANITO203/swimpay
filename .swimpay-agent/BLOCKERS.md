# Blockers

No current critical blockers.

Last checked after Sprint 4B Gradle wrapper and Android build validation: 2026-05-02T20:18:00+03:00.

Known non-critical limitations:

- Global `gradle` is still not available in PATH, but the repo now has a trusted generated Gradle wrapper.
- Android Gradle commands require `ANDROID_HOME` or `ANDROID_SDK_ROOT` to point to `C:\Users\Lenovo\AppData\Local\Android\Sdk` on this machine.
- Emulator smoke validation has not run yet.
- Android Keystore, encrypted outbox and WorkManager behavior still need emulator/device validation.
- Production-grade asymmetric receiver device signature verification still needs emulator/device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
