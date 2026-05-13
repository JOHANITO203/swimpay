# Staging Webhook Schema Audit

Date: 2026-05-13

## Goal

Verify real schema before configuring webhook endpoint and delivery rehearsal.

## Commands to run on VPS

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code

sudo docker exec -i swimpay-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d+ webhook_endpoints"'
sudo docker exec -i swimpay-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d+ webhook_deliveries"'
sudo docker exec -i swimpay-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d+ webhook_events"'
```

## Current known result snapshot

- `webhook_endpoints`: table exists, but no active endpoint row for tested merchant.
- `webhook_deliveries`: table exists, but no delivery rows for tested window.
- Migrations present in repo include:
  - `020_review_action_actor_identity.sql`
  - `021_ozon_bank_runtime_verified.sql`
  - `022_checkout_return_url_and_webhook_payload.sql`

