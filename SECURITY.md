# Security Policy

## Security model

SwimPay processes merchant-side bank notification signals with explicit merchant consent.

SwimPay does not:

- read SMS;
- read the buyer phone;
- scrape banking apps;
- access internal bank app databases;
- initiate payments;
- hold funds;
- claim official bank confirmation.

## Sensitive data

Sensitive data includes:

- buyer phone numbers;
- sender phone numbers;
- sender names;
- bank notification content;
- references;
- merchant API keys;
- webhook secrets;
- device public/private keys;
- audit event metadata.

## Required protections

- Normalize and HMAC phone numbers for matching.
- Mask phone numbers in all dashboards.
- Avoid storing raw notification text.
- Store redacted/canonicalized templates.
- Hash API keys.
- Sign webhooks.
- Sign Receiver App events.
- Enforce anti-replay with `event_id`, `notification_hash` and `local_counter`.
- Use PostgreSQL constraints for critical uniqueness.
- Keep PostgreSQL, Valkey and NATS private to the Docker/internal network.

## Android Receiver security

The Receiver App must:

- filter by allowlisted bank packages;
- verify package signatures before trust;
- ignore non-bank notifications locally;
- redact sensitive data before upload where possible;
- store local outbox encrypted;
- sign every uploaded event;
- send heartbeat and health status;
- never finalize payment decisions locally.

## Reporting security issues

Until a formal bounty program exists, report issues privately to the project owner. Do not disclose exploitable issues publicly.

## Production note

The single-server V1 is acceptable for MVP/beta, but not high-availability production. After V1 stable, split app/data servers and harden monitoring, backups and incident response.
