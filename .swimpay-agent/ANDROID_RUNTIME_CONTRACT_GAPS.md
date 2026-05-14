# Android Runtime Contract Gaps

generated_at: 2026-05-14T00:00:00+03:00

## Dashboard

- `merchant metrics summary`: field_exists.
- `review counts`: field_exists.
- `webhook health`: partially_available.
- `receiver health`: partially_available.
- `recent activity`: field_exists.
- Missing data behavior: can_derive_safely as unavailable/empty only.

## Review Queue / Detail

- `reviews endpoint`: field_exists.
- `review detail endpoint`: field_exists.
- `manual actions`: field_exists.
- `raw notification`: must_not_derive and must_not_display.

## Receiving Methods

- `receiving routes endpoint`: field_exists.
- `route type card/SBP`: field_exists.
- `masked destination`: field_exists.
- Missing data behavior: empty state.

## Integrations

- `single integration detail`: field_exists.
- `developer integration actions`: field_exists.
- `multi-site integration list`: endpoint_missing_or_not_wired.
- `delivery history rows`: endpoint_missing_or_not_wired.
- Missing data behavior: must_not_derive fake `merchant.example`, fake `200 OK` or fake delivery percentages.

## Receiver Health

- `local notification access`: field_exists locally.
- `receiver heartbeat/runtime state`: field_exists_or_partially_available.
- `bank target status`: partially_available locally.
- Missing data behavior: degraded/offline/unavailable state.

## Security Settings

- `app lock`: field_exists locally.
- `Google link/recovery`: field_exists locally.
- `remote active sessions/devices`: repository_missing.
- `session IP/location`: must_not_derive.
- Missing data behavior: honest unavailable state.

