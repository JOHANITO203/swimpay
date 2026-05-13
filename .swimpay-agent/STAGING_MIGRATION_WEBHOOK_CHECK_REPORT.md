# Staging Migration + Signed Webhook Check Report

Date: 2026-05-13  
Mode: audit-only (no runtime/code changes)

## 1) Migration presence in repo

Confirmed in repository:

- `020_review_action_actor_identity.sql`
- `021_ozon_bank_runtime_verified.sql`
- `022_checkout_return_url_and_webhook_payload.sql`

Key schema intent validated from SQL:

- `022` adds `orders.return_url`.
- `020` adds actor metadata fields for review actions.
- `021` enriches bank runtime metadata (not directly webhook delivery logic).

## 2) What your provided logs prove

From provided staging logs (web service):

- checkout status polling is active:
  - `GET /checkout/<session>/status` -> `200`
- checkout page served:
  - `GET /checkout/<session>` -> `200`
- deterministic return fallback is reached:
  - `GET /merchant/return-unavailable?...` -> `200`

Conclusion from these logs:

- UX return target was missing/unsafe for that session, so fallback page was used.
- This log excerpt **does not contain evidence of webhook delivery attempts**.
- It is web-tier traffic; webhook dispatch evidence should come primarily from `swimpay-job-worker` and DB `webhook_deliveries`.

## 3) Signed webhook fulfillment: current evidence status

Current status: **not proven from provided logs**.

Missing evidence in excerpt:

- no `payment.confirmed` delivery creation log
- no outbound webhook attempt log
- no target response status for webhook call
- no retry/dead-letter info
- no signature-header verification trace on external backend

## 4) Mandatory staging checks to run now

Run on VPS (read-only verification):

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

### A) Schema checks (migration outcomes)

```bash
docker exec -i swimpay-postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='orders'
  AND column_name IN ('return_url');
\""
```

```bash
docker exec -i swimpay-postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='review_actions'
  AND column_name IN ('actor_type','actor_source','actor_display');
\""
```

### B) Delivery records around tested session/order

```bash
docker exec -i swimpay-postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
SELECT id, endpoint_id, event_id, event_type, status, attempt_count, last_http_status, next_retry_at, updated_at
FROM webhook_deliveries
WHERE created_at > now() - interval '6 hours'
ORDER BY created_at DESC
LIMIT 100;
\""
```

```bash
docker exec -i swimpay-postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
SELECT id, event_type, object_type, object_id, created_at
FROM audit_events
WHERE created_at > now() - interval '6 hours'
  AND event_type ILIKE 'webhook.%'
ORDER BY created_at DESC
LIMIT 200;
\""
```

### C) Worker/API logs for webhook path

```bash
docker logs --since 6h swimpay-job-worker 2>&1 | grep -iE \"payment.confirmed|webhook|delivery|retry|dead|signature|timeout|failed|error|warn\"
```

```bash
docker logs --since 6h swimpay-api 2>&1 | grep -iE \"review.confirmed|manual_confirmed|payment.confirmed|webhook|external_id|return_url|delivery|error|warn\"
```

### D) External backend reception proof

Collect from merchant external backend logs:

- incoming `POST` to webhook endpoint
- headers present:
  - `SwimPay-Event-Id`
  - `SwimPay-Timestamp`
  - `SwimPay-Signature`
- response status code (2xx expected)
- signature verification result (pass/fail)

## 5) Likely interpretation right now

Based on the provided data only:

- The visible issue is **UX return config** (fallback page shown).
- Webhook fulfillment may still be working, but there is currently **no log proof in this excerpt**.

So the next step is not code change; it is evidence collection from:

1. `webhook_deliveries` DB rows
2. `swimpay-job-worker` logs
3. external backend webhook receiver logs

## 6) Redaction policy

- Do not publish webhook secret values.
- Do not publish full API keys/tokens.
- Keep only masked endpoint URLs if shared externally.

