# 21 — Data Retention and Privacy

## Data minimization

Store only what is required for matching, audit and product operation.

## Data classes

### Operational data

- orders;
- payment sessions;
- signals;
- matches;
- decisions;
- webhook deliveries.

### Sensitive data

- phone numbers;
- names;
- notification text;
- references;
- API keys;
- webhook secrets.

## Retention policy V1

Recommended starting policy:

- raw debug data: disabled by default;
- redacted signal data: 90 days;
- audit events: 180 days minimum for beta;
- webhook delivery logs: 90 days;
- API key records: until revoked + retention period;
- templates: retained while useful, redacted only.

## Phone data

Use HMAC for matching.

Store masked phone for UI.

Do not store raw phone unless explicitly required and encrypted with short retention.

## Training data

Training/template samples must be redacted.

Merchant consent for operational matching does not automatically mean consent for global template training.

## Deletion

When merchant deletes account:

- revoke API keys;
- disable devices;
- stop new processing;
- retain audit only as required;
- delete or anonymize non-required data.
