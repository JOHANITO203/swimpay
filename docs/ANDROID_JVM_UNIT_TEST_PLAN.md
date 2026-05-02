# Android JVM Unit Test Plan

Sprint 4B generated the trusted Gradle wrapper and ran Android JVM unit tests.

When Gradle is available, add and run JVM tests under:

```text
apps/android-receiver/android/app/src/test
```

Expected command:

```bash
cd apps/android-receiver/android
./gradlew :app:testDebugUnitTest
```

Windows PowerShell:

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:testDebugUnitTest
```

## Required Test Coverage

- `ReceiverStatusViewModel` warning derivation.
- Canonical signed payload generation.
- Fake signer boundary behavior.
- Encrypted outbox state transitions.
- WorkManager retry policy boundaries.
- No raw phone stored or displayed.
- No raw notification text stored or displayed.
- No SMS API usage.
- No bank app scraping behavior.
- No Android payment confirmation or auto-confirmation behavior.

Sprint 4B added JVM tests under `apps/android-receiver/android/app/src/test` for status warning derivation, canonical payload generation, fake signer behavior and encrypted outbox boundaries. The repository also keeps static TypeScript tests around the Android project files and source boundaries.
