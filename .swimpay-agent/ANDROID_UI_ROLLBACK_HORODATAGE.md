# Android UI Rollback Horodatage

Date: 2026-05-15
Timezone: Europe/Moscow

## Rollback target

- Target commit: `7e95985`
- Target commit date: 2026-05-13 17:11:55 +0300
- Target message: `Refactor code structure for improved readability and maintainability`

## Rollback commit

- Rollback commit pushed to `main`: `8853347`
- Commit message: `rollback android merchant ui to 7e95985`

## Device install

- Staging APK rebuilt after rollback.
- Installed on device serial: `R5CWA0FEPZW`
- Package: `com.swimpay.receiver`

## Scope note

This rollback restored the Android Merchant UI layer and related UI tests/resources to the selected commit.

Backend/API Google session timeout diagnostics were intentionally left as separate local work and are not part of the rollback documentation commit.
