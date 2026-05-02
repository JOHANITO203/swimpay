# 08 — Android Receiver Specification

## Purpose

The Android Receiver App captures authorized merchant-side bank notifications, extracts useful signal data, redacts sensitive values, signs the event and uploads it to SwimPay backend.

## Absolute rule

Android captures. Backend decides.

Android must never finalize payment confirmation.

## V1 banks

- Sberbank;
- Tinkoff / T-Bank;
- VTB;
- Alfa-Bank;
- Gazprombank.

Bank packages and signing certificate fingerprints are not trusted until verified.

## Required modules

### Onboarding

Must explain:

- SwimPay uses Android Notification Access;
- Android grants a broad notification permission;
- SwimPay filters locally using a bank allowlist;
- only selected bank notifications are processed;
- non-bank notifications are ignored locally;
- SwimPay does not read buyer devices;
- SwimPay does not read SMS.

### Notification Access

Guide merchant to enable Notification Access.

Show status:

- enabled;
- disabled;
- listener connected;
- listener disconnected.

### Bank Allowlist

Merchant selects bank apps.

App must store allowed bank profiles only.

### Bank App Verification

Verify:

- package name;
- signing certificate SHA-256;
- installed app version;
- bank profile mapping.

Do not mark a bank as trusted if package/cert is unknown.

### Notification Snapshot Extractor

Extract all possible fields:

- packageName;
- notification id;
- tag;
- key;
- postTime;
- channelId;
- groupKey;
- sortKey;
- `EXTRA_TITLE`;
- `EXTRA_TITLE_BIG`;
- `EXTRA_TEXT`;
- `EXTRA_BIG_TEXT`;
- `EXTRA_SUB_TEXT`;
- `EXTRA_SUMMARY_TEXT`;
- `EXTRA_TEXT_LINES`;
- tickerText.

### Signal Coalescer

Bank notifications may update quickly. The app must coalesce snapshots.

Recommended window:

```text
800ms to 1500ms
```

Output must include:

- snapshot count;
- chosen title/body;
- final redacted text;
- notification hash.

### Local Parser

Extract locally when possible:

- amount;
- currency;
- phone;
- reference;
- direction candidate;
- negative keywords.

Backend will re-validate.

### Privacy Firewall

Must:

- ignore non-allowlisted packages;
- avoid uploading raw non-bank notifications;
- redact sensitive values;
- HMAC phone/reference if keying is available;
- mask phone for UI;
- block upload if package/cert is unknown and configured as strict.

### Local Encrypted Outbox

Every captured signal must be stored before upload.

States:

- `captured`;
- `pending_upload`;
- `uploading`;
- `acked`;
- `failed_retrying`;
- `expired`.

Store:

- event id;
- notification hash;
- observed at;
- encrypted payload;
- attempt count;
- last attempt time.

### Signed Upload

Each event must include:

- `event_id`;
- `device_id`;
- `merchant_id`;
- `bank_profile_id`;
- `package_name`;
- `package_cert_sha256`;
- `notification_hash`;
- `local_counter`;
- `observed_at`;
- `payload`;
- `signature`.

Use a device keypair generated during device registration.

### Receiver Armed Mode

Backend sends active payment sessions to the Receiver.

Session payload:

```json
{
  "payment_session_id": "ps_01",
  "expected_amount_minor": 13700,
  "currency": "RUB",
  "buyer_phone_hmac": "hmac_...",
  "reference_hmac": "hmac_...",
  "valid_until": "2026-05-01T21:15:00Z"
}
```

Receiver uses this only for prioritization/pre-match, not final decision.

### Heartbeat

Send heartbeat with:

- device id;
- notification access status;
- listener status;
- selected banks;
- queue length;
- last signal time;
- app version;
- Android version;
- health status.

## Android UI screens

- Onboarding;
- Permission guide;
- Bank selection;
- Test signal;
- Connected banks;
- Device status;
- Local queue status;
- Privacy explanation.

## Forbidden

- No SMS reading.
- No bank app scraping.
- No internal bank database access.
- No final confirmation on Android.
- No upload of non-bank notifications.
