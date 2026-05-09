# P0 Receiver Health Gate Report

generated_at: 2026-05-09T23:10:00+03:00

Status: partially implemented.

Already present:

- Receiver heartbeat validation.
- Receiver warning states for notification access, listener disconnected, missing bank targets and queue backlog.
- Signal upload eligibility blocks non-eligible receiver/device states.

Added:

- Shared `ReceiverHealth` contract type for healthy/degraded/offline status.

Remaining:

- Checkout adaptive UX:
  - healthy => normal;
  - degraded => warning;
  - offline => do not promise automatic detection, show manual fallback.
- More heartbeat signature/device identity tests.
