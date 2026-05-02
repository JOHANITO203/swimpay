# Task 012 — Webhook Worker

## Goal

Implement signed webhook delivery with retries and replay.

## Read first

- `docs/12_WEBHOOKS.md`
- `docs/07_EVENT_CATALOG.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Requirements

Implement:

- webhook endpoints;
- event payload creation;
- HMAC signature;
- delivery worker;
- retry schedule;
- delivery logs;
- manual replay.

## Acceptance criteria

- Webhooks include required headers.
- Events include `official_bank_confirmation: false`.
- Retry works.
- Replay works.
- Duplicate endpoint/event delivery prevented.
