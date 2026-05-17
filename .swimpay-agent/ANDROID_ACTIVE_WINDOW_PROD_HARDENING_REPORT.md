# Android Active Window Production Hardening

Date: 2026-05-17

## Scope

This pass hardens the remaining pre-production risk from the background notification reliability audit:

- Android must only sweep and upload receiver signals while a backend-owned payment intent window is active.
- The active window must come from backend state, not from a stale local-only flag.
- Android must still never confirm a payment or claim official bank confirmation.

## Root Cause

The Android receiver already had a local runtime gate:

- `paymentIntentActive`
- `receiverArmed`
- `expectedPaymentProfilePresent`
- `receivingRouteLocked`

But that gate could become stale because it was not continuously synchronized from backend-owned payment session state.

Production risk:
- the listener/sweep could stay disabled after a checkout becomes active if the dashboard was not refreshed;
- or stay permissive after a checkout window expires if the local config was stale;
- heartbeat state and dashboard state did not share the same backend-owned runtime truth.

## Backend Hardening

Modified:
- `apps/api/src/orders.ts`
- `apps/api/src/server.ts`
- `apps/api/src/receiver-devices.ts`
- `apps/api/src/android-merchant.test.ts`
- `apps/api/src/receiver-devices.test.ts`

Implemented:
- `OrderRepository.listActiveReceiverPaymentSessions(...)`.
- PostgreSQL implementation that returns only sessions that are:
  - `receiver_armed`, `awaiting_payment`, or `buyer_claimed_paid`;
  - not expired;
  - expected payment profile present;
  - payment method present;
  - receiving route selected;
  - receiver bank profile selected;
  - route locked;
  - route lock not expired.
- `/v1/android-merchant/dashboard-summary` now includes `receiver_runtime_config`.
- `/v1/receiver-devices/heartbeat` now also includes `receiver_runtime_config`.
- Heartbeat response `active_payment_sessions_count` now reflects backend-owned runtime config when present.

The response is intentionally safe:
- no expected payment fingerprint;
- no raw buyer data;
- no raw receiving identifier;
- no final payment decision;
- `official_bank_confirmation=false` remains intact.

## Android Hardening

Modified:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverRuntimeConfigStore.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/work/ReceiverHeartbeatWorker.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantApiWiringTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumMerchantRuntimeContractTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/work/ReceiverHeartbeatWorkerTest.kt`

Added:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverRuntimeConfigSynchronizer.kt`

Implemented:
- Android dashboard repository parses backend-owned `receiver_runtime_config`.
- `PremiumMerchantRuntime.loadDashboard()` persists the backend runtime config into `ReceiverRuntimeConfigStore`.
- Mobile runtime factory wires the real shared config store.
- Heartbeat worker also synchronizes `receiver_runtime_config` from heartbeat responses.
- The notification listener and active sweep continue to use `ReceiverRuntimeConfigStore`, but that store is now refreshed by both dashboard load and background heartbeat.

## Behavior After Hardening

When backend has no active receiver payment session:
- `paymentIntentActive=false`;
- `receiverArmed=false`;
- `expectedPaymentProfilePresent=false`;
- `receivingRouteLocked=false`;
- Android sweep remains closed.

When backend has a valid active receiver payment session:
- `paymentIntentActive=true`;
- `receiverArmed=true`;
- `expectedPaymentProfilePresent=true`;
- `receivingRouteLocked=true`;
- Android sweep can run only through the existing allowlist/redaction/signed-outbox path.

## Verification

Red phase was confirmed:
- backend dashboard test failed because `receiver_runtime_config` was absent;
- Android parser/runtime tests failed because `receiverRuntimeConfig` and writer wiring did not exist.

Green phase:

```powershell
npm test -- apps/api/src/receiver-devices.test.ts apps/api/src/android-merchant.test.ts -- -t "heartbeat response can carry|receiver runtime config|dashboard summary|updates heartbeat health"
```

Result: passed, 43 tests across the selected files.

```powershell
.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMerchantApiWiringTest.dashboardRepositoryParsesBackendOwnedReceiverRuntimeConfig --tests com.swimpay.receiver.PremiumMerchantRuntimeContractTest.premiumRuntimePersistsBackendOwnedReceiverRuntimeConfigFromDashboard --tests com.swimpay.receiver.work.ReceiverHeartbeatWorkerTest.heartbeatResponseSynchronizesBackendOwnedReceiverRuntimeConfig --no-daemon --max-workers=1 --no-watch-fs
```

Result: BUILD SUCCESSFUL.

Broader verification:

```powershell
npm test -- packages/contracts/src/android-receiver.test.ts apps/api/src/receiver-devices.test.ts apps/api/src/android-merchant.test.ts apps/job-worker/src/no-notification-fallback.test.ts
```

Result: passed, 71 tests.

```powershell
.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidReceiverRealRuntimeTest --tests com.swimpay.receiver.ActiveIntentNotificationSweepTest --tests com.swimpay.receiver.AndroidMerchantApiWiringTest --tests com.swimpay.receiver.PremiumMerchantRuntimeContractTest --tests com.swimpay.receiver.ReceiverListenerLifecycleStoreTest --tests com.swimpay.receiver.work.ReceiverHeartbeatWorkerTest --tests com.swimpay.receiver.work.WorkManagerHardeningTest --tests com.swimpay.receiver.work.SignalUploadFlusherTest --no-daemon --max-workers=1 --no-watch-fs
```

Result: BUILD SUCCESSFUL.

```powershell
npm run typecheck -- --pretty false
```

Result: passed.

```powershell
npm run android:assemble:staging
```

Result: BUILD SUCCESSFUL, `:app:assembleStaging`.

## Prod Alignment Decision

Ready for staging-to-production candidate.

This closes the previously listed active-window synchronization risk by making backend payment-session state the source of truth for Android receiver arming.

Remaining production concerns are operational, not contract blockers:
- OEM battery restrictions can still delay WorkManager;
- operator/device validation should still confirm notification listener access and battery optimization handling on the target phone before release.
