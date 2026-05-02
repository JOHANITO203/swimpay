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

## Current Sprint 4A Status

The current machine has Java and an Android SDK, but `gradle` is not available in `PATH` and no Gradle wrapper JAR is checked in. Wrapper generation is therefore blocked until Gradle is installed or otherwise made available from a trusted source.

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
