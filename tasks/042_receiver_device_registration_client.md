# 042 - Receiver Device Registration Client

## Goal

Implement a testable Android Receiver client for `POST /v1/receiver-devices/register`.

## Scope

- Build request payloads aligned with `docs/ANDROID_RECEIVER_CONTRACT.md`.
- Require configured backend base URL; do not hardcode production URLs.
- Parse device id, status, server time, required capabilities and warnings.
- Keep secrets out of code and responses.

## Acceptance Criteria

- Registration success and failure paths are tested.
- No raw secret value is exposed in parsed responses.
- Android still does not make payment decisions.
