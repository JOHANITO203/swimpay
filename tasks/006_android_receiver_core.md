# Task 006 — Android Receiver Core

## Goal

Implement the first Android Receiver App core.

## Read first

- `docs/08_ANDROID_RECEIVER_SPEC.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Requirements

Implement Android modules:

- onboarding;
- Notification Access guide;
- bank allowlist UI;
- notification listener;
- snapshot extraction;
- local coalescing;
- local parser minimal;
- privacy firewall;
- encrypted outbox;
- signed upload stub/implementation;
- heartbeat.

## Acceptance criteria

- Non-allowlisted notifications are ignored locally.
- Bank notification snapshots extract title/body/bigText/subText/textLines.
- Outbox persists before upload.
- Upload includes event id, notification hash, local counter and signature.
- No final confirmation logic exists in Android.
