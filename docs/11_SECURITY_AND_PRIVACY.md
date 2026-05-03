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

Sprint 4C adds emulator smoke diagnostics and manual validation steps. No new Android permissions, scraping behavior, raw PII exposure or local payment decisions are added.

Sprint 4G adds persistent Android debug state and outbox storage for real-device smoke hardening. Persisted values are limited to safe device metadata and redacted signed signal payloads. Raw phone numbers, raw notification text, secrets and local payment-confirmation state are rejected by the storage boundary. The current SharedPreferences-backed outbox is a local MVP boundary, not production-grade encryption.

Sprint 4H replaces the active outbox storage path with an Android Keystore-backed protected adapter for redacted signed payloads. The previous SharedPreferences outbox remains only as a migration source and JVM test boundary. The app rejects raw phone values, raw notification text, raw title/body keys and secret-like values before persistence. WorkManager retry is bounded and network-constrained, and debug smoke controls remain debug-only.

Sprint 4I adds a debug-only synthetic notification listener smoke path. Synthetic package and certificate values are explicitly marked `synthetic_debug_only` and are not production trust evidence. The listener logs only safe metadata, redacts before outbox/upload, and keeps Android payment confirmation and auto-confirmation impossible.

Sprint 4L adds a PackageManager evidence dry-run boundary. Evidence is collected only for an explicit operator-selected package and is treated as observed metadata. Concrete package/cert values become `pending_verification`, not trusted. Diagnostics mask certificate hashes and redact secret-like fields.

Sprint 4M adds backend/admin storage and review for bank package evidence. The evidence table stores package names, certificate hashes and safe device/app metadata only; it stores no phone numbers and no notification text. Submitted evidence is `pending_operator_review`, and approval is limited to `approved_for_review_only`. The workflow does not enable auto-confirmation, does not mark a bank app trusted and does not claim official bank confirmation.

Sprint 4O adds production trust policy states for bank package/certificate metadata. Production trust requires review-only approval first, a production trust request, stronger owner/admin permission and second-actor approval. `TO_VERIFY`, `synthetic_debug_only`, rejected and deprecated evidence cannot become production trusted. Production trust is metadata-only and still does not enable auto-confirmation.

Sprint 4S hardens the operator review lifecycle. Exact duplicate evidence is idempotent and does not create additional audit side effects. Changed certificates create new review-required evidence. Operator review actions use explicit reason codes with redacted notes. Deprecation is non-destructive, writes audit, and never enables production trust or auto-confirmation. Admin evidence filters are metadata-only and do not enumerate installed apps or expose raw PII.

Sprint 4T adds evidence lifecycle rehearsal visibility. The review dashboard and evidence audit trace filters expose masked certificate hashes and redacted audit payloads only. They do not expose raw phone numbers, raw notification text, raw title/body, secrets, API keys or private keys. Dashboard safety flags remain explicit: evidence is not trusted, production trust is not requested by review-only actions and auto-confirmation stays disabled.

Sprint 4U adds a local evidence lifecycle rehearsal helper. Its default mode is non-mutating and validates dashboard/audit redaction against the local backend. Production trust guard validation requires an explicit local evidence id and is limited to proving dual-control; it must still keep `trusted: false` and `auto_confirm_enabled: false`.

Sprint 4V adds a read-only operator evidence web surface. The page renders masked certificate hashes, status counts and redacted audit events only. It does not expose admin tokens, raw phone numbers, raw notification text, raw title/body, full certificate hashes, secrets, API keys or private keys. The page is non-mutating and cannot request, approve or revoke production trust.

Sprint 4W adds a production trust handoff rehearsal helper. It is non-mutating by default and requires explicit local/dev evidence id, requester token, approver token and opt-in flag before making trust transition calls. It verifies same-actor approval is blocked, second-actor approval keeps auto-confirmation disabled, revocation is available and audit traces stay redacted.

Sprint 4X adds a local signed operator token helper and signed-token handoff rehearsal. The helper signs local development tokens for the existing `signed_token` admin auth path and does not alter RBAC. The local rehearsal proves request, same-actor block, second-operator approval, revocation and redacted audit continuity while keeping `trusted=false` and `auto_confirm_enabled=false`. Generated unmasked tokens are local secrets and must not be committed or used as production operator lifecycle tooling.

Sprint 4Y adds a local-only signed-token Compose override and handoff playbook. The default Compose configuration stays in `dev_token` mode; signed-token Compose must be selected explicitly with `infra/docker-compose.signed-admin.override.yml` and a local HMAC secret. Mutating handoff still requires explicit evidence id, signed requester token, signed approver token and opt-in flags. The drill must revoke metadata trust before closeout and must not process real notifications or enable auto-confirmation.

Sprint 4P adds a controlled real package evidence dry-run mechanism. It requires one explicit operator/user supplied `package_name`, uses Android PackageManager for that exact package only and returns `package_not_found` without submitting evidence when absent. Installed-app enumeration, app scraping, notification processing, SMS access and automatic trust remain forbidden.

Sprint 4R adds package visibility controls. Android debug/operator builds may declare exact package visibility for an explicitly selected evidence dry run, currently `ru.sberbankmobile`. SwimPay must not request `QUERY_ALL_PACKAGES`, must not enumerate installed apps and must not treat package visibility as trust. Visibility only allows one explicit PackageManager lookup; evidence still remains pending operator review or review-only.
