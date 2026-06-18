\pset pager off
\echo ==== per-merchant activity (318ce516=2026-05-19, c7bb0dff=2026-06-10) ====
SELECT tbl, right(merchant_id::text,12) AS merchant_tail, n FROM (
  SELECT 'orders' tbl, merchant_id, count(*) n FROM orders GROUP BY merchant_id
  UNION ALL SELECT 'notification_signals', merchant_id, count(*) FROM notification_signals GROUP BY merchant_id
  UNION ALL SELECT 'payment_sessions', merchant_id, count(*) FROM payment_sessions GROUP BY merchant_id
  UNION ALL SELECT 'merchant_receiving_routes', merchant_id, count(*) FROM merchant_receiving_routes GROUP BY merchant_id
  UNION ALL SELECT 'webhook_endpoints', merchant_id, count(*) FROM webhook_endpoints GROUP BY merchant_id
  UNION ALL SELECT 'webhook_deliveries', merchant_id, count(*) FROM webhook_deliveries GROUP BY merchant_id
  UNION ALL SELECT 'review_queue', merchant_id, count(*) FROM review_queue GROUP BY merchant_id
  UNION ALL SELECT 'review_actions', merchant_id, count(*) FROM review_actions GROUP BY merchant_id
  UNION ALL SELECT 'api_keys', merchant_id, count(*) FROM api_keys GROUP BY merchant_id
  UNION ALL SELECT 'receiver_devices', merchant_id, count(*) FROM receiver_devices GROUP BY merchant_id
  UNION ALL SELECT 'merchant_integrations', merchant_id, count(*) FROM merchant_integrations GROUP BY merchant_id
  UNION ALL SELECT 'amount_leases', merchant_id, count(*) FROM amount_leases GROUP BY merchant_id
  UNION ALL SELECT 'audit_events', merchant_id, count(*) FROM audit_events GROUP BY merchant_id
) t
ORDER BY tbl, merchant_tail;
