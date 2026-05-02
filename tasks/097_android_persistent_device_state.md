# 097 Android Persistent Device State

## Goal

Persist safe Android Receiver debug registration state so debug smoke actions survive activity recreation and app restart.

## Scope

- Store only safe receiver state fields such as `device_id`, `device_status`, `server_time`, `app_version`, timestamps, and debug backend URL.
- Do not store secrets, raw phone numbers, raw notification text, raw bank notifications, package trust claims, or payment confirmation state.
- Add tests for save, load, clear, and PII rejection.

## Acceptance Criteria

- Debug registration stores safe device state.
- Heartbeat and upload can reuse stored `device_id`.
- Clearing state removes the stored device id.
- Tests prove raw phone and raw notification text are rejected.

