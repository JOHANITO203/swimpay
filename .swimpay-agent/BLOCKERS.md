# Blockers

No current critical blockers.

Last checked after Sprint 3D Android runnable app setup validation: 2026-05-02T19:34:00+03:00.

Known non-critical limitations:

- Gradle is not available in PATH and no Gradle wrapper JAR is checked in, so Android assemble/debug build was not run.
- Android SDK exists locally at `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
- Java exists locally through Android Studio JBR.
- Production-grade asymmetric receiver device signature verification still needs emulator/device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
- Live PostgreSQL/NATS integration smoke tests are documented but not yet automated as a containerized integration suite.
- Android Keystore, encrypted outbox and WorkManager code are platform skeletons until a Gradle build and emulator tests are available.
