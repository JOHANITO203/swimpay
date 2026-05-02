# Task 007 — Signal Ingestion Endpoint

## Goal

Implement backend ingestion for signed Receiver App signals.

## Read first

- `docs/06_API_SPEC.md`
- `docs/08_ANDROID_RECEIVER_SPEC.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Requirements

Implement `POST /v1/receiver/signals`.

Must verify:

- device exists;
- signature valid;
- event id unique;
- notification hash unique;
- local counter increasing;
- bank profile exists;
- package/cert is known or pending according to strictness.

## Acceptance criteria

- Valid signal stored.
- Duplicate event id rejected.
- Duplicate notification hash rejected.
- Invalid signature rejected.
- Local counter regression rejected.
- `signal.received` event emitted.
