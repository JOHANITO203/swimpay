# Bank Target Lock Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: ready with device metric pending.

The Bank Target Lock uses an exact V1 package list:
- Sberbank: `ru.sberbankmobile`
- T-Bank: `com.idamob.tinkoff.android`
- VTB: `ru.vtb24.mobilebanking.android`
- Alfa-Bank: `ru.alfabank.mobile.android`
- Gazprombank: `ru.gazprombank.android.mobilebank.app`

## Evidence

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/BankTargetLock.kt`
- `apps/android-receiver/android/app/src/main/AndroidManifest.xml`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/BankTargetLockTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidReceiverRealRuntimeTest.kt`
- `apps/android-receiver/src/android-runnable-app.test.ts`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| Supported activated bank accepted | ready | Unit tests accept enabled supported package. |
| Supported non-activated bank rejected | ready | Unit tests reject supported but not enabled package. |
| Unsupported package rejected | ready | Unit tests reject unrelated package. |
| No QUERY_ALL_PACKAGES | ready | Manifest/source tests enforce absence. |
| No broad enumeration | ready | Tests reject `getInstalledPackages`, `getInstalledApplications`, `queryIntentActivities`. |

## Missing Proof

Record on-device supported-bank detection count from the installed staging APK without broad enumeration.

