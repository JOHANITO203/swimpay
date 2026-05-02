# Android Receiver Lifecycle

Sprint 3C connects the Android Receiver MVP core to backend lifecycle contracts through testable TypeScript clients and source-ready Android boundaries.

## Device Registration Client

`createReceiverApiClient()` sends:

```text
POST /v1/receiver-devices/register
```

The client requires a configured `baseUrl`; no production URL is hardcoded. The request includes device name, app version, Android version, public key, install id and supported capabilities. Parsed responses expose only device id, merchant id, status, server time, required capabilities and warnings.

## Signed Heartbeat Client

`buildSignedHeartbeatPayload()` builds the backend heartbeat shape and signs the canonical payload through the existing signing interface.

Warnings parsed by the client include:

- `notification_access_disabled`
- `listener_disconnected`
- `device_version_outdated`
- `queue_backlog_high`
- `bank_profile_unverified`

No raw phone, notification text, API keys or secrets are included.

## Signed Signal Upload Client

`buildSignedSignalUploadPayload()` creates the redacted upload payload for:

```text
POST /v1/receiver/signals
```

It rejects raw phone fields and raw notification text. `raw_text_present` must be `false`. `TO_VERIFY` package/cert metadata is marked untrusted and cannot imply payment confirmation.

An accepted upload means:

```text
backend_decision_pending
```

It does not mean payment confirmation.

## Encrypted Outbox Model

`RetryingEncryptedOutbox` is a platform-neutral test model. Android Keystore and encrypted platform storage remain future Android implementation work.

Statuses:

- `captured`
- `pending_upload`
- `uploading`
- `acked`
- `failed_retrying`
- `expired`

Retry schedule:

- immediate
- 30 seconds
- 2 minutes
- 5 minutes
- 15 minutes
- capped at 15 minutes for later attempts

The outbox dedupes by event id and stores encrypted redacted signed payloads only.

## Health Status

`buildReceiverHealthStatus()` derives a safe local health snapshot with:

- notification access state
- listener connection state
- allowed/trusted bank counts
- queue length
- last signal/upload timestamps
- app version
- device status
- warnings

Warnings include disabled notification access, disconnected listener, no allowed banks, all banks untrusted, queue backlog, backend unreachable and battery optimization risk.

## Local Smoke Plan

`npm run smoke:receiver` prints a synthetic local backend smoke plan:

1. register receiver device
2. send signed heartbeat
3. upload synthetic redacted signal
4. verify `backend_decision_pending`
5. verify `TO_VERIFY` routes to review

It does not require a real Android device and does not call external services.

## Guardrails

- Android does not confirm payment.
- Android does not auto-confirm payment.
- Android does not read SMS.
- Android does not scrape banking apps.
- Android does not upload non-allowlisted notifications.
- Android does not upload raw phone or raw notification text.
- Backend remains the decision authority.
