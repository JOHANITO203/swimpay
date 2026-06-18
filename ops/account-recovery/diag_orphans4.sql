\pset pager off
\echo ==== owners ====
SELECT right(m.id::text,12) AS merchant_tail, m.created_at::date AS m_created,
 right(m.owner_user_id::text,12) AS owner_tail, u.google_sub IS NOT NULL AS has_google, u.status AS user_status
FROM merchants m JOIN users u ON u.id=m.owner_user_id
WHERE m.android_profile_type IS NOT NULL ORDER BY m.created_at;

\echo ==== android_merchant_devices (binding) ====
SELECT right(merchant_id::text,12) AS merchant_tail, right(user_id::text,12) AS user_tail,
 left(device_proof_hash,8) AS proof_pfx, status, created_at::date AS created, last_seen_at
FROM android_merchant_devices ORDER BY created_at;

\echo ==== receiver_devices (signal capture) ====
SELECT right(merchant_id::text,12) AS merchant_tail, left(device_proof_hash,8) AS proof_pfx, status, created_at::date AS created, last_seen_at
FROM receiver_devices ORDER BY created_at;

\echo ==== receiving routes per merchant ====
SELECT right(merchant_id::text,12) AS merchant_tail, status, created_at::date AS created
FROM merchant_receiving_routes ORDER BY created_at;
