# 100 Android Live Backend Status Refresh

## Goal

Show live backend reachability in debug mode using the real local health endpoint.

## Scope

- Use `http://127.0.0.1:8080/api-health` with adb reverse in debug mode.
- Show safe states: reachable, unreachable, last check time, redacted error summary.
- Do not show secrets, full responses, raw phone, or raw notification text.

## Acceptance Criteria

- Main status screen can refresh backend health.
- Tests cover reachable, unreachable, timestamp, and redaction behavior.

