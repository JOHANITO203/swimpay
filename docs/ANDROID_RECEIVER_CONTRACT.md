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
  "public_key": "device-public-key-or-dev-verification-key",
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
- `device_version_outdated`
- `bank_profile_unverified`
- `queue_backlog_high`
- `battery_optimization_risk`

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
hmac_sha256_canonical_v1
```

The signed payload must include:

- `event_id`
- `notification_hash`
- `device_id`
- `observed_at`
- `local_counter`
- package and bank profile metadata
- redacted signal fields

The current foundation uses the registered device `public_key` value as a deterministic verification key in local tests. A production-grade asymmetric verification layer is intentionally future work.

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
- Real package/certificate verification is not implemented.
- `TO_VERIFY` package/cert metadata remains untrusted.
- Backend signal matching and payment decisions remain in the signal runtime pipeline.
