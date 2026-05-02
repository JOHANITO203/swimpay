# 11 — Security and Privacy

## Principles

- Minimize sensitive data.
- Redact before storage when possible.
- HMAC data used for matching.
- Encrypt secrets and sensitive payloads.
- Keep decisions auditable.
- Do not claim official bank confirmation.

## Prohibited data access

SwimPay must not:

- read SMS;
- read buyer phone notifications;
- scrape bank apps;
- read internal bank app storage;
- bypass Android protections;
- upload non-bank notifications.

## Phone handling

Phone numbers must be:

1. normalized;
2. HMACed for matching;
3. masked for display;
4. never logged raw.

Example mask:

```text
+7 *** *** **67
```

## Notification text

Store raw notification text only if absolutely required and only short-lived. Default storage is redacted/canonicalized text.

Canonical placeholders:

- `<AMOUNT>`;
- `<CURRENCY>`;
- `<PHONE>`;
- `<PERSON>`;
- `<REFERENCE>`;
- `<CARD_MASK>`.

Android Receiver Sprint 3B applies a local privacy firewall before upload. The local MVP core redacts phone-like values, amount/currency strings, card masks and SwimPay-style references, then emits only parser hints. Normal upload payloads set `raw_text_present` to `false`.

## Receiver App signing

Each Receiver device has a keypair.

Each uploaded signal must be signed.

Backend verifies:

- device exists;
- public key matches;
- signature valid;
- receiver device is not suspended, revoked or disabled;
- event id unique;
- notification hash unique;
- local counter increasing.

Current V1 foundation signature algorithm:

```text
hmac_sha256_canonical_v1
```

The foundation uses the registered receiver public key field as the local deterministic verification key in tests. Production-grade asymmetric verification remains a follow-up hardening step and must not introduce a bypass mode.

## Anti-replay

Use:

- `event_id` unique;
- `notification_hash` unique;
- `local_counter` monotonic;
- PostgreSQL unique indexes;
- optional server nonce/request hash for sensitive operations.

## API keys

API keys are stored hashed.

Do not log API keys.

Scopes must be supported.

## Webhook signatures

Headers:

```text
SwimPay-Event-Id
SwimPay-Timestamp
SwimPay-Signature
```

Signature should be HMAC over timestamp + raw payload.

## Infrastructure security

On the single server:

- only ports 22, 80 and 443 public;
- PostgreSQL private;
- Valkey private;
- NATS private;
- Docker daemon not public;
- SSH keys only;
- no root password login;
- UFW enabled;
- backups external.

## Audit

Audit events are required for:

- order state transitions;
- payment session transitions;
- signal ingestion;
- signature verification failures;
- matching decisions;
- review actions;
- webhook failures;
- bank/template promotion/degradation.

## Android Receiver MVP Boundary

The Android Receiver MVP foundation is capture-only:

- no Android payment confirmation;
- no Android auto-confirmation;
- no SMS access;
- no bank app scraping;
- no non-allowlisted notification upload;
- no raw phone upload;
- no raw notification text upload.

Package/cert values marked `TO_VERIFY` stay untrusted locally and on the backend.

Sprint 3C adds receiver lifecycle clients and an outbox model. The outbox stores encrypted redacted signed payloads only, dedupes by event id, and tracks retry metadata without raw phone numbers or raw notification text. Android Keystore and encrypted platform storage remain future Android-platform implementation work.

Sprint 3D adds Android platform-facing boundaries for Keystore signing, encrypted outbox storage and WorkManager upload retry. These are app foundations only; Android still does not confirm or auto-confirm payments, and no SMS or accessibility scraping permissions are requested.

Sprint 4A adds build-toolchain diagnostics only. It does not change receiver runtime behavior, does not add permissions, and does not weaken privacy guardrails.

Sprint 4B generates the Gradle wrapper and validates Android build/tests. It adds no SMS permission, scraping behavior, local payment confirmation or auto-confirmation behavior.
