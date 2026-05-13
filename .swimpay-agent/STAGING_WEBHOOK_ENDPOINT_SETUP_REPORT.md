# Staging Webhook Endpoint Setup Report

Date: 2026-05-13

## Root fact from audit

- `review.confirmed` is produced and acked by `swimpay-job-worker`.
- No webhook endpoint configured (`webhook_endpoints` empty for test merchant).
- Therefore no `payment.confirmed` delivery can be created.

## Preferred setup path (API, not manual SQL)

Use merchant integration endpoint:

- `PUT /v1/merchant/integration/webhook-url`

Body:

```json
{
  "webhook_url": "https://api.swimvpn.pro/webhooks/swimpay"
}
```

Expected behavior:

1. Ensures merchant integration row.
2. Ensures webhook secret exists (masked in response; one-time secret is handled by integration flow).
3. Creates/updates active webhook endpoint.
4. Enables public V1 events:
   - `payment.confirmed`
   - `payment.rejected`
   - `payment.expired`

## Verification commands

```bash
sudo docker exec -i swimpay-postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
SELECT id, merchant_id, url, status, enabled_events, updated_at
FROM webhook_endpoints
ORDER BY updated_at DESC
LIMIT 20;
\""
```

```bash
sudo docker exec -i swimpay-postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
SELECT merchant_id, webhook_url, webhook_status, webhook_endpoint_id, updated_at
FROM merchant_integrations
ORDER BY updated_at DESC
LIMIT 20;
\""
```

## Security note

- Do not paste webhook secret in logs or reports.
- Do not place secret in Android app.

