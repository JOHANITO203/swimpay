# Task 005 — Receiver Device Registration

## Goal

Implement backend support for Android Receiver registration and heartbeat.

## Read first

- `docs/06_API_SPEC.md`
- `docs/08_ANDROID_RECEIVER_SPEC.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Requirements

Implement:

- `POST /v1/receiver-devices/register`
- `POST /v1/receiver-devices/heartbeat`

Store:

- device id;
- merchant id;
- public key;
- app version;
- Android version;
- notification access status;
- last heartbeat.

## Acceptance criteria

- Device can register.
- Public key stored.
- Heartbeat updates health.
- Audit event emitted for registration.
- Tests cover registration and heartbeat.
