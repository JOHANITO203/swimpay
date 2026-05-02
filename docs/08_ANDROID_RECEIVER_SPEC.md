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
