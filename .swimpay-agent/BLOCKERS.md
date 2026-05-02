# Blockers

No current critical blockers.

Last checked after Sprint 4A Android toolchain activation validation: 2026-05-02T19:58:00+03:00.

Known non-critical limitations:

- Gradle is not available in PATH and no Gradle wrapper JAR is checked in, so Android `assembleDebug` was not run.
- Android JVM unit tests were not run because Gradle/wrapper is unavailable.
- Android SDK exists locally at `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
- Java exists locally through Android Studio JBR: OpenJDK `21.0.10`.
- A trusted local Gradle installation is required before generating wrapper files.
- Do not manually invent or paste `gradle-wrapper.jar`.
- Production-grade asymmetric receiver device signature verification still needs emulator/device validation.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
- Android Keystore, encrypted outbox and WorkManager code still need Gradle build and emulator/device validation.
