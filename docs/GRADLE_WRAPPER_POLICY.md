# Gradle Wrapper Policy

SwimPay may check in a Gradle wrapper only when it is generated from a trusted local Gradle installation.

## Allowed Generation

From the Android project root:

```bash
cd apps/android-receiver/android
gradle wrapper
```

On Windows PowerShell, the command is the same when `gradle` is available in `PATH`:

```powershell
cd apps/android-receiver/android
gradle wrapper
```

The generated files should then be reviewed before commit:

- `gradlew`
- `gradlew.bat`
- `gradle/wrapper/gradle-wrapper.jar`
- `gradle/wrapper/gradle-wrapper.properties`

## Prohibited Generation

Do not manually invent or paste a Gradle wrapper JAR.

Do not copy a wrapper from an unknown project or untrusted download.

Do not claim Android build readiness because Gradle files exist. `assembleDebug` is PASS only after the command actually runs successfully.

## Current Sprint 4B Status

The current machine has Java and an Android SDK. Global `gradle` is not available in `PATH`, so Sprint 4B used a local temporary Gradle `8.11.1` distribution downloaded from `services.gradle.org` and verified against the official SHA256 checksum before running `gradle wrapper`.

The repository now contains a generated Gradle wrapper. The wrapper properties point to:

```text
https://services.gradle.org/distributions/gradle-8.11.1-bin.zip
```

## Expected Build Command After Wrapper Generation

```bash
cd apps/android-receiver/android
./gradlew :app:assembleDebug
```

Windows PowerShell:

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:assembleDebug
```

## Safety Notes

- Do not add production secrets to Gradle files.
- Do not add real bank package names or certificate fingerprints.
- Do not add SMS permissions.
- Do not add accessibility scraping behavior.
- Android must not confirm or auto-confirm payments.
