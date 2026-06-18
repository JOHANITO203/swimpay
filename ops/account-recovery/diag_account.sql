\pset pager off
\echo == device courant (le plus récent) → sur quel marchand ? ==
SELECT right(merchant_id::text,12) AS merchant, right(user_id::text,12) AS usr, left(device_proof_hash,8) AS proof, status, last_seen_at
FROM android_merchant_devices ORDER BY last_seen_at DESC LIMIT 5;

\echo == marchands android : owner google + webhook + clés + commandes ==
SELECT right(m.id::text,12) AS merchant, m.created_at::date AS created,
 (u.google_sub IS NOT NULL) AS has_google, u.status AS user_status,
 (SELECT count(*) FROM orders o WHERE o.merchant_id=m.id) AS orders,
 (SELECT count(*) FROM webhook_endpoints w WHERE w.merchant_id=m.id) AS webhooks,
 (SELECT count(*) FROM api_keys k WHERE k.merchant_id=m.id) AS api_keys,
 (SELECT count(*) FROM merchant_receiving_routes r WHERE r.merchant_id=m.id) AS routes
FROM merchants m JOIN users u ON u.id=m.owner_user_id
WHERE m.android_profile_type IS NOT NULL ORDER BY m.created_at;

\echo == webhook endpoints (marchand 318ce516 = le vrai) ==
SELECT right(merchant_id::text,12) AS merchant, left(url, 42) AS url, status, created_at::date
FROM webhook_endpoints WHERE merchant_id IN (SELECT id FROM merchants WHERE id::text LIKE 'd8db6373%');
