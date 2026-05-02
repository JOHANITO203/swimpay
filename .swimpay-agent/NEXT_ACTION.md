# Next Action

generated_at: 2026-05-02T14:47:23+03:00

## Latest completed task

024_operator_auth_and_admin_rbac is complete.

## Commands run

See `.swimpay-agent/PROGRESS_LOG.md` for targeted TDD evidence and final validation status.

## Pass/fail status

PASS

## Blockers

No current blockers.

## Next recommended task

025_nats_jetstream_consumers (`tasks/025_nats_jetstream_consumers.md`)

## What not to do next

- Do not push to remote until the user explicitly asks.
- Do not expose admin endpoints publicly without production operator identity, secret rotation and network policy.
- Do not reintroduce `Bearer admin_<operator_id>` placeholder auth.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not create real bank package or certificate values.
- Do not deploy.
- Do not continue after failing checks unless the failure is understood and documented.
