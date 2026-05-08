# Android Receiver Contract

## Purpose

This document defines the backend-facing contract for the SwimPay V1 Android Receiver.

The Android Receiver captures merchant-authorized bank notification signals, filters them locally, redacts sensitive values, signs the upload and sends it to SwimPay. The backend verifies, stores, matches and decides.

Android must not finalize payment confirmation.

## Non-Negotiable Boundaries

- SwimPay is a Payment Signal Engine, not a PSP or bank.
- Android does not read SMS.
- Android does not scrape banking apps.
- Android does not upload non-bank notifications.
- Android does not upload raw phone numbers by default.
- Android does not upload raw notification text by default.
- Android does not claim official bank confirmation.
- Backend responses never set `official_bank_confirmation` to true.
- Bank package names and certificate fingerprints marked `TO_VERIFY` are untrusted.
- Bank package and certificate observations remain untrusted until explicit operator verification. Backend admin review can verify an observed row only when both `package_name` and `package_cert_sha256` are concrete non-`TO_VERIFY` values.
- Android PackageManager evidence is observation only. It can create `pending_verification` / review-only metadata, but it must not automatically create production trust.

## Device Registration

Endpoint:

```text
POST /v1/receiver-devices/register
```

Request:

```json
{
  "device_name": "Merchant counter phone",
  "app_version": "0.1.0",
  "android_version": "14",
  "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "device_install_id": "install_...",
  "supported_capabilities": [
    "notification_access",
    "signed_signal_upload",
    "local_redaction",
    "signal_coalescing"
  ]
}
```

Response:

```json
{
  "device_id": "dev_...",
  "merchant_id": "mch_...",
  "status": "pending",
  "trust_score": 0,
  "server_time": "2026-05-02T00:00:00.000Z",
  "required_capabilities": [
    "notification_access",
    "signed_signal_upload",
    "local_redaction"
  ]
}
```

Registration does not automatically trust the device or any bank metadata. The public key is stored for signed signal upload verification. The response does not expose secrets.

In production, receiver registration requires an authenticated merchant context. Local `Bearer test_*` merchant bearers are accepted only by non-production/dev foundations and are rejected in production.

## Heartbeat

Endpoint:

```text
POST /v1/receiver-devices/heartbeat
```

Request:

```json
{
  "device_id": "dev_...",
  "app_version": "0.1.0",
  "android_version": "14",
  "notification_access_enabled": true,
  "listener_connected": true,
  "allowed_bank_profile_ids": ["sber_ru"],
  "queue_length": 0,
  "last_signal_observed_at": "2026-05-02T00:00:00.000Z",
  "battery_optimization_ignored": true,
  "timestamp": "2026-05-02T00:00:00.000Z",
  "signature": "hex-signature"
}
```

Response:

```json
{
  "device_id": "dev_...",
  "device_status": "active",
  "status": "active",
  "notification_access": true,
  "last_heartbeat_at": "2026-05-02T00:00:00.000Z",
  "server_time": "2026-05-02T00:00:00.000Z",
  "receiver_mode": "active",
  "active_payment_sessions_count": 0,
  "warnings": [],
  "required_actions": []
}
```

Warnings:

- `notification_access_disabled`
- `listener_disconnected`
- `regrant_required_after_reinstall`
- `device_version_outdated`
- `bank_profile_unverified`
- `bank_targets_missing`
- `queue_backlog_high`
- `battery_optimization_risk`

Operational statuses:

- `pending`
- `active`
- `inactive`
- `degraded`
- `revoked`
- `needs_reconnect`
- `notification_access_missing`
- `bank_targets_missing`
- `force_review_local`

`notification_access_missing`, `needs_reconnect`, `bank_targets_missing`, `inactive` and `revoked` are action-required states. These states must not be used as proof of payment. Signal uploads from disabled or action-required devices are rejected by the backend except for explicitly cautious states such as `force_review_local`.

## Onboarding Readiness

The backend-facing Receiver contract distinguishes app notification permission from Notification Listener Access:

- `app_notifications_permission` means the Receiver can show its own notifications.
- `notification_listener_access` means the Receiver can observe Android notifications and apply the local bank allowlist.

Only Notification Listener Access enables bank signal detection. App notifications ON with listener access OFF must be treated as not ready.

Receiver readiness requires:

- Notification Listener Access enabled;
- at least one selected bank profile;
- backend configuration present;
- device registration completed or safely pending.

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

`TO_VERIFY` bank metadata can lead only to review-only readiness. It cannot establish production trust or auto-confirm eligibility.

## Signed Signal Upload

Endpoint:

```text
POST /v1/receiver/signals
```

Request:

```json
{
  "event_id": "evt_...",
  "merchant_id": "mch_...",
  "device_id": "dev_...",
  "bank_profile_id": "sber_ru",
  "package_name": "TO_VERIFY",
  "package_cert_sha256": "TO_VERIFY",
  "observed_at": "2026-05-02T00:00:00.000Z",
  "received_at": "2026-05-02T00:00:01.000Z",
  "notification_hash": "hash_...",
  "semantic_hash": "hash_...",
  "local_counter": 1,
  "snapshot_count": 2,
  "coalesced": true,
  "amount_minor": 13700,
  "currency": "RUB",
  "sender_phone_hmac": "hmac_...",
  "sender_phone_masked": "+7 *** *** **33",
  "reference_hmac": "hmac_...",
  "reference_code_masked": "SWP-A***",
  "direction_hint": "incoming_customer_transfer",
  "parser_hint": "android-local-v1",
  "signal_quality_hint": 80,
  "redacted_title": "Transfer <AMOUNT> <CURRENCY>",
  "redacted_body": "Transfer from <PHONE>. <REFERENCE>",
  "raw_text_present": false,
  "signature": "hex-signature"
}
```

Response:

```json
{
  "signal_id": "sig_...",
  "status": "received",
  "accepted": true,
  "reason_codes": [],
  "server_time": "2026-05-02T00:00:00.000Z",
  "next_action": "backend_decision_pending"
}
```

Accepted uploads only mean the signal was stored and queued for backend processing. They do not mean payment was confirmed.

## Notification Snapshot DTO

The local Android layer may produce snapshots with:

- `title`
- `text`
- `big_text`
- `sub_text`
- `summary_text`
- `text_lines`
- `ticker_text`
- `channel_id`
- `category`
- `group_key`
- `sort_key`
- `notification_id`
- `tag`
- `post_time`
- `package_name`

Raw snapshot text must be redacted before upload unless a future restricted debug mode is explicitly enabled. That debug mode is not implemented in V1.

## Coalescing

The Android Receiver should merge multiple updates from the same Android notification into one backend signal.

Fields:

- `coalescing_window_ms`
- `snapshot_count`
- `first_snapshot_at`
- `last_snapshot_at`
- `coalesced_hash`
- `notification_hash`
- `semantic_hash`

Duplicate snapshots must not create duplicate payment signals. Backend uniqueness on `event_id` and `notification_hash` remains the final protection.

## Signature Contract

The signed payload is canonical JSON with deterministic key ordering and excludes the `signature` field.

Supported algorithm:

```text
ecdsa_p256_sha256_der_v1
```

The signed payload must include:

- `event_id`
- `notification_hash`
- `payload_hash`
- `device_id`
- `observed_at`
- `local_counter`
- package and bank profile metadata
- redacted signal fields

The Android Receiver signs with an Android Keystore-held EC P-256 private key.
Only the PEM public key is registered on the backend. Shared HMAC-style receiver
keys are not accepted for real signal upload. Debug-only smoke paths must remain
isolated from non-debug runtime.

Signal upload is accepted only when:

- the receiver device exists for the merchant;
- the receiver device status is `pending`, `active` or `degraded`;
- the signature is present;
- the signature matches the canonical payload;
- the local counter is strictly greater than the device's last accepted counter.

Devices in `suspended`, `revoked` or `disabled` state cannot upload signals.

## Error Codes

- `device_not_registered`
- `device_disabled`
- `signature_missing`
- `signature_invalid`
- `event_id_duplicate`
- `notification_hash_duplicate`
- `package_not_allowed`
- `package_cert_unverified`
- `bank_profile_untrusted`
- `payload_invalid`
- `raw_phone_rejected`
- `raw_notification_rejected`
- `local_counter_replay`
- `timestamp_out_of_range`
- `notification_access_required`
- `receiver_outdated`

Persistence-level duplicate responses currently use the existing API error names `duplicate_event_id`, `duplicate_notification_hash`, and `local_counter_regression`.

Production upload hardening rejects stale or future `observed_at` values outside the accepted server clock tolerance before ingestion. This check complements signature verification, monotonic local counters and database uniqueness constraints.

## Observability

The API increments safe receiver counters for:

- receiver registrations
- receiver heartbeats
- accepted receiver signals
- rejected receiver signals
- invalid receiver signatures

No metric contains raw phone values, raw notification text, API keys or signatures.

## Current Limitations

- Sprint 3B adds a Kotlin-source-ready Android skeleton and executable TypeScript MVP core, but does not add a Gradle Android build.
- Sprint 3B adds a NotificationListenerService boundary skeleton. Platform permission UX and a runnable installed Android app remain future work.
- Sprint 3C adds testable receiver lifecycle clients for registration, signed heartbeat, signed redacted signal upload, encrypted outbox retry modeling and safe health snapshots.
- Sprint 3D adds Android Gradle project files and Kotlin platform boundaries, but Android assemble has not run because Gradle is unavailable in the current shell and no wrapper JAR is checked in.
- Sprint 4A adds explicit Android toolchain diagnostics and wrapper policy. `assembleDebug` remains blocked until Gradle or a trusted wrapper is available.
- Sprint 4B generates a trusted Gradle wrapper and validates `assembleDebug` plus Android JVM unit tests. Emulator/device validation remains future work.
- Sprint 4C adds emulator smoke diagnostics and documents that APK install/live app validation is blocked until Android Emulator/AVD or a real test device is available.
- Sprint 4F wires debug-only app-side registration, heartbeat, synthetic redacted signal upload and outbox smoke actions to the local backend over `adb reverse tcp:8080 tcp:8080`.
- Sprint 4G adds persistent debug receiver device state, a protected SharedPreferences-backed outbox boundary for redacted signed payloads, bounded retry policy wiring and live debug backend health refresh. The protected outbox is suitable for local MVP smoke validation but is not claimed as production-grade encryption.
- Sprint 4H adds Android Keystore-backed platform storage boundaries for outbox ciphertext, keeps the JVM fake storage isolated to tests, adds migration from the previous local outbox storage, and wires debug WorkManager retry to the persistent outbox flush boundary. Release mode still has no debug smoke controls or dev backend fallback.
- Sprint 4I adds a synthetic debug notification listener contract using only `synthetic_debug_only` package/certificate metadata. It validates capture, coalescing, redaction, outbox and signed upload boundaries without real bank notifications. Synthetic package/cert metadata remains pending verification and cannot become production trust evidence.
- Real package/certificate verification is not implemented.
- `TO_VERIFY` package/cert metadata remains untrusted.
- Sprint 4L adds a PackageManager evidence dry-run boundary. It collects evidence only for an explicit operator-selected package name, masks diagnostics and keeps all observed values review-only until backend/operator verification.
- Sprint 4M adds `/v1/bank-evidence` for receiver-side evidence submission and RBAC-protected `/v1/admin/bank-evidence` review endpoints. Submitted evidence is `pending_operator_review`; operator approval can only set `approved_for_review_only` and does not create production trust or auto-confirmation eligibility.
- Sprint 4O adds a separate backend production trust policy for bank package/certificate metadata. The allowed path is `approved_for_review_only -> production_trust_requested -> production_trust_approved`, with dual-control and revocation. Production trust is metadata-only and still does not enable payment auto-confirmation.
- Sprint 4S makes exact duplicate evidence submission idempotent, adds review reason codes, adds non-destructive evidence deprecation and adds metadata-only admin filters. These lifecycle actions do not process notifications, create production trust or enable auto-confirmation.
- Sprint 4P adds an operator-controlled real package evidence dry-run boundary. Android accepts only one explicit `package_name`, performs PackageManager lookup for that exact package, returns `package_not_found` if absent and submits metadata only after explicit action. It does not enumerate installed apps, process real notifications or create trust automatically.
- Sprint 4R adds package visibility hardening. If Android hides an installed package from the app, the receiver reports `PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED` with operator guidance. Exact debug/operator `<queries>` entries may be used for explicitly selected packages such as `ru.sberbankmobile`; this does not create trust, does not process notifications and does not enable auto-confirmation. `QUERY_ALL_PACKAGES` remains forbidden in V1.
- Backend signal matching and payment decisions remain in the signal runtime pipeline.
- Sprint 6E adds a real-notification shadow readiness gate. Real bank notification shadow mode is disabled by default with `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=false`; it requires consent, review-only bank selection, Notification Listener Access, backend health and outbox health before any future controlled run. `SWIMPAY_REAL_BANK_AUTO_CONFIRM=false` and `SWIMPAY_RAW_NOTIFICATION_STORAGE=false` remain required safe defaults.
