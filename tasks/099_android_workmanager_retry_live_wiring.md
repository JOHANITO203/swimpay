# 099 Android WorkManager Retry Live Wiring

## Goal

Wire outbox flush scheduling to WorkManager or the existing Android retry boundary.

## Scope

- Retry only `pending_upload` and `failed_retrying` entries.
- Use bounded retry delays.
- Support manual debug flush.
- Respect network availability through WorkManager constraints where available.
- Keep release behavior safe and avoid infinite retries.

## Acceptance Criteria

- Retry policy is deterministic and bounded.
- WorkManager enqueue boundary can schedule upload work.
- JVM tests cover retry boundaries and outbox state transitions.

