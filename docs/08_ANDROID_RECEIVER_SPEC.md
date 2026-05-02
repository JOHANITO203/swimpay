# 08 - Android Receiver Specification

## Purpose

The Android Receiver captures authorized merchant-side bank notifications, filters allowed bank apps locally, extracts operational signal fields, redacts sensitive values, signs the upload and sends it to SwimPay.

Android captures. Backend decides.

Android must never finalize payment confirmation.

## V1 Banks

V1 targets bank profiles for:

- Sberbank
- Tinkoff / T-Bank
- VTB
- Alfa-Bank
- Gazprombank

The repo must not invent verified package names or certificate fingerprints. Metadata marked `TO_VERIFY` or `pending_verification` is untrusted and cannot pass auto-confirmation gates.

PackageManager evidence collection is a dry-run/operator workflow. It may observe a concrete package name and signing certificate hash for an explicitly selected package, but that evidence remains `pending_verification` and review-only until an operator verifies it through the backend workflow.

## Required Android Responsibilities

- guide the merchant through Notification Access setup
- filter locally using the bank allowlist
- ignore non-bank packages locally
- extract notification snapshot fields
- coalesce multiple snapshots from the same notification
- redact raw phone and notification text before upload
- HMAC matchable phone/reference fields where configured
- sign uploads with the registered device key
- keep a local monotonic counter for replay protection
- send heartbeats with health and queue state

## Forbidden Android Behavior

- no SMS reading
- no bank app scraping
- no hidden data collection
- no final payment confirmation
- no official bank confirmation wording
- no upload of non-bank notifications
- no raw phone upload by default
- no raw notification text upload by default

## Backend-Facing Endpoints

The backend contract is defined in `docs/ANDROID_RECEIVER_CONTRACT.md`.

Minimum V1 endpoints:

- `POST /v1/receiver-devices/register`
- `POST /v1/receiver-devices/heartbeat`
- `POST /v1/receiver/signals`

Accepted signal upload means only that SwimPay stored the signal and queued backend processing. It does not confirm payment.

## Notification Snapshot Fields

Android may read platform notification fields such as:

- package name
- notification id
- tag
- post time
- channel id
- group key
- sort key
- title
- text
- big text
- sub text
- summary text
- text lines
- ticker text

Only redacted fields should leave the device in normal mode.

Sprint 3B defines this as an MVP TypeScript/Kotlin-source-ready boundary. The listener receives platform notification objects, ignores non-allowlisted packages, extracts a snapshot, coalesces duplicate updates, applies the privacy firewall and builds a signed upload envelope. It does not confirm payment locally.

## Signal Coalescing

Bank notifications may update quickly. The app should coalesce snapshots over a short window, then upload one signal with:

- `snapshot_count`
- `first_snapshot_at`
- `last_snapshot_at`
- `coalesced_hash`
- `notification_hash`
- `semantic_hash`

Backend uniqueness constraints on `event_id` and `notification_hash` protect final idempotency.

The default MVP coalescing window is:

```text
1500 ms
```

## Signed Upload

The signed payload excludes `signature` and uses canonical JSON with deterministic key ordering.

Required anti-replay fields:

- `event_id`
- `notification_hash`
- `device_id`
- `observed_at`
- `local_counter`
- `signature`

Missing signatures are rejected unless a future explicit test-only mode is added. No such production bypass exists.

## Receiver Armed Mode

Backend may expose active payment session summaries to help the receiver prioritize matching signals locally. Android may use these summaries only for local prioritization and extraction hints.

Android must not use these summaries to confirm payment.

## Health Expectations

Heartbeats report:

- notification access enabled/disabled
- listener connected/disconnected
- queue length
- allowed bank profile ids
- app version
- Android version
- last signal observed timestamp
- battery optimization risk

Backend warnings include notification access, listener connectivity, queue backlog and battery optimization risks.

## Local Parser Hints

The Android Receiver may emit extraction hints only:

- amount minor units;
- currency;
- masked sender phone;
- masked reference code;
- direction hint;
- negative keyword hints.

These hints are not payment decisions. Backend matching and decision logic remain authoritative.

## Sprint 3C Lifecycle Foundation

The receiver core now includes testable local clients and models for:

- device registration;
- signed heartbeat;
- signed signal upload;
- encrypted outbox retry state;
- safe receiver health status;
- local backend smoke planning.

These are TypeScript-testable foundations for the later Android platform implementation. They do not add Android payment confirmation, SMS access, bank app scraping, or real bank package/cert trust.

## Sprint 3D Android Runnable App Foundation

The repository now includes Android project files and Kotlin source boundaries for:

- app module configuration;
- `NotificationListenerService` manifest declaration;
- safe receiver status screen/model;
- Android Keystore signer skeleton;
- encrypted outbox platform adapter boundary;
- WorkManager upload retry skeleton;
- emulator smoke documentation.

The app still does not confirm or auto-confirm payments. Android assemble has not been run in the current shell because Gradle is not installed and no wrapper JAR is checked in.

## Sprint 4A Toolchain Status

Sprint 4A adds an explicit Android toolchain doctor and Gradle wrapper policy. Current status is:

- Java available.
- Android SDK available.
- Gradle unavailable in `PATH`.
- Gradle wrapper unavailable.
- `assembleDebug` blocked until Gradle or a trusted wrapper exists.

This is a tooling blocker only; it does not change the receiver safety boundary.

## Sprint 4B Build Status

Sprint 4B generated a trusted Gradle wrapper, enabled AndroidX, aligned Java/Kotlin target 17, and ran:

- `:app:assembleDebug`
- `:app:testDebugUnitTest`

Both pass with `ANDROID_HOME`/`ANDROID_SDK_ROOT` set to the local SDK. Emulator/device validation remains future work.

## Sprint 4C Emulator Smoke Status

## Sprint 4F Device-Side Debug Smoke

The debug Android app can call the local backend through adb reverse:

```text
adb reverse tcp:8080 tcp:8080
http://127.0.0.1:8080
```

The debug-only smoke controller supports:

- `GET /api-health`
- `POST /v1/receiver-devices/register`
- `POST /v1/receiver-devices/heartbeat`
- `POST /v1/receiver/signals`

The signal upload action sends synthetic redacted notification-signal data with `TO_VERIFY` package/cert metadata. Accepted upload means backend processing is pending. Android still does not confirm, auto-confirm or make a payment decision.

Outbox debug actions can enqueue and flush synthetic redacted payloads. Failed uploads move to retry state; successful uploads become acknowledged. No raw phone number or raw notification text is stored.

## Sprint 4G Persistent Outbox and Live Status

Sprint 4G hardens the debug Android app for local real-device validation:

- registration state is persisted with safe fields only;
- heartbeat, synthetic signal upload and outbox flush reuse the stored device id;
- redacted signed outbox entries persist through a SharedPreferences-backed protected storage boundary;
- outbox entries dedupe by `event_id` and `notification_hash`;
- retry delays are bounded: immediate, 30s, 2m, 5m, then 15m capped;
- the main status screen refreshes `/api-health` in debug mode through `http://127.0.0.1:8080`;
- cleartext HTTP remains debug-localhost only.

The Sprint 4G storage boundary does not claim production-grade encryption. A production app must replace it with Android Keystore-backed encrypted storage before real merchant rollout.

All Sprint 4G smoke payloads remain synthetic and redacted. Android still does not confirm, auto-confirm or make a payment decision.

## Sprint 4H Production Storage and Worker Hardening

Sprint 4H adds the first production-oriented Android storage and worker boundary:

- signing policy explicitly distinguishes debug and production receiver modes;
- production mode rejects the JVM fake signer and has no dev signer bypass;
- platform outbox storage uses Android Keystore AES/GCM protection through an adapter boundary;
- legacy debug SharedPreferences outbox records are migrated into the protected adapter with event/hash dedupe;
- cleanup purges old acknowledged and expired outbox records;
- WorkManager retry remains network-constrained, unique and bounded;
- debug smoke controls remain in debug source sets and are hidden by `BuildConfig.DEBUG`;
- release mode does not expose debug registration, heartbeat, synthetic upload or flush controls.

The current real-device smoke remains synthetic and redacted. Real bank package/certificate verification and real bank notification testing remain out of scope.

## Sprint 4I Synthetic Notification Listener E2E

Sprint 4I adds a debug-only synthetic notification source for real-device listener smoke tests. The source is marked `synthetic_debug_only`, is not production trust evidence, and uses only redacted examples. The listener path extracts safe snapshot metadata, coalesces duplicate snapshots, redacts before outbox/upload, and queues a signed notification signal for backend processing.

Android still does not confirm or auto-confirm payments. Successful listener smoke means the backend can receive a redacted notification signal and continue with backend decision pending or review.

See `docs/SYNTHETIC_NOTIFICATION_TESTING.md`.

## Phase 4J Receiver Onboarding Gate

The Receiver is not ready merely because Android lets the app show its own notifications. SwimPay tracks two separate Android permission states:

- `app_notifications_permission`: lets SwimPay Receiver show its own app notifications.
- `notification_listener_access`: lets SwimPay Receiver observe notifications for local allowlist filtering.

Notification Listener Access is mandatory for payment signal detection.

If app notifications are enabled but Notification Listener Access is disabled, the Receiver state is `notification_access_required`, with:

- `receiver_ready = false`
- `capture_enabled = false`
- `upload_enabled = false`, except explicit debug/test actions

The onboarding UI must include:

```text
Activer l'accès aux notifications
```

The action opens Android's official Notification Listener settings. SwimPay must not bypass Android settings.

Required explanation:

```text
Android donne une permission large d'accès aux notifications. SwimPay applique ensuite une allowlist locale : seules les notifications des banques que vous choisissez sont analysées. Les autres notifications sont ignorées localement.
```

Readiness states:

- `not_installed`
- `installed`
- `notification_access_required`
- `bank_selection_required`
- `backend_config_required`
- `device_registration_required`
- `ready_review_only`
- `ready`
- `degraded`

For V1, `TO_VERIFY` and review-only bank selections can reach `ready_review_only`, not an auto-confirm readiness state. Android still does not confirm or auto-confirm payments.

## Sprint 4L Package/Certificate Evidence Dry Run

Sprint 4L adds Android-side model and platform boundaries for PackageManager package/certificate evidence.

Rules:

- evidence collection requires an explicit package name;
- evidence is observation only;
- concrete package/cert evidence maps to `pending_verification`;
- placeholder `TO_VERIFY` values remain untrusted;
- `synthetic_debug_only` evidence remains debug-only;
- no evidence path creates Android payment confirmation or auto-confirm readiness.

See `docs/BANK_PACKAGE_EVIDENCE_DRY_RUN.md`.

Sprint 4C adds an emulator doctor and manual smoke procedure. Current environment status:

- `adb` available from the Android SDK.
- Android Emulator command unavailable.
- No AVDs available.
- No running devices attached.

APK install, Notification Access UI validation, receiver registration from the app, synthetic app-side signal upload and outbox offline/online smoke are blocked until an emulator/device is available.
