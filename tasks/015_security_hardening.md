# Task 015 — Security Hardening

## Goal

Harden authentication, signatures, privacy and server-facing configuration.

## Read first

- `docs/11_SECURITY_AND_PRIVACY.md`
- `SECURITY.md`

## Requirements

Implement/check:

- API key hashing;
- webhook secret hashing;
- HMAC helpers;
- phone masking;
- redacted logs;
- anti-replay tests;
- no raw notification logs;
- private service networking.

## Acceptance criteria

- Sensitive values not logged.
- API keys are not stored raw.
- Webhook signatures verified in tests.
- Receiver signatures verified in tests.
