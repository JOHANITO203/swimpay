# Staging Schema Reconciliation Audit

Date: 2026-05-13

## Scope

- `orders`
- `payment_sessions`
- `review_queue`
- `amount_leases`
- `expected_payment_profiles` (logical contract; fields persisted on `payment_sessions`)
- `webhook_endpoints`
- `webhook_deliveries`
- `audit_events`
- `webhook_events` (assumed by manual checks, verified against real schema)

## Migration status (from staging evidence + repo)

1. `018_checkout_external_flow_reconciliation.sql` -> **divergent**
   - Not directly proven as fully applied on staging in the latest VPS run.
   - Some columns from this lineage exist, but runtime evidence still shows incomplete checkout progression for new session.

2. `020_review_action_actor_identity.sql` -> **applied**
   - Staging query confirms `review_actions.actor_type`, `actor_source`, `actor_display` present.

3. `021_ozon_bank_runtime_verified.sql` -> **applied**
   - Operator executed migration successfully on VPS.

4. `022_checkout_return_url_and_webhook_payload.sql` -> **applied**
   - `orders.return_url` exists on staging.

## Table/contract reconciliation

### `orders`
- `return_url` present on staging -> **applied**
- Recent rows show `return_url` persisted -> **aligned**

### `payment_sessions`
- Runtime row for latest rehearsal session:
  - status=`receiver_arming`
  - `selected_receiving_route_id` null
  - `amount_lease_id` null
  - `receiver_armed_at` null
- This is runtime-flow incomplete, not a pure schema-missing signal -> **partial**

### `review_queue`
- For latest rehearsal session: no review row (expected when not armed/not due) -> **aligned with current preconditions**
- Staging schema differs from an assumed query that used `review_type`/`updated_at` (those columns were queried manually but absent) -> **divergent assumption**

### `amount_leases`
- Table exists in repo and runtime logic depends on it.
- Latest rehearsal session has no lease linked because checkout did not reach profile/route-ready stage -> **partial runtime**

### `expected_payment_profiles`
- No dedicated table in current runtime model.
- Expected profile data is persisted on `payment_sessions` fields -> **legacy_table/contract mismatch in assumptions**

### `webhook_endpoints`
- Table exists; now has active row for merchant test id after setup -> **aligned**

### `webhook_events`
- Table does not exist on staging (`relation "webhook_events" does not exist`) -> **legacy_table assumption**
- Current implementation uses `webhook_deliveries` as durable delivery ledger and payload container.

### `webhook_deliveries`
- Table exists and is canonical for pending/delivered/dead statuses -> **aligned**
- No rows for the new rehearsal session yet because session never reached review-confirmed/final event path -> **aligned with runtime state**

### `audit_events`
- `review.confirmed` events exist for previous confirmed sessions.
- For latest rehearsal session only `order.created` exists so far -> **aligned with runtime progression**

## Classification summary

- applied:
  - `020_review_action_actor_identity`
  - `021_ozon_bank_runtime_verified`
  - `022_checkout_return_url_and_webhook_payload`
- missing:
  - none strictly proven by schema introspection in this pass
- divergent:
  - operator assumptions using non-existent `webhook_events`, `review_type`, `review_queue.updated_at`
- legacy_table:
  - `webhook_events` assumed but not part of current schema
  - `expected_payment_profiles` assumed as table, but implemented as `payment_sessions` columns
- code_expects_missing_column:
  - not detected in local tests for current checkout paths
- migration_required:
  - no new migration required from this audit alone; blocker is runtime flow completion, not DDL absence

