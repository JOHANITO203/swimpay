\pset pager off
\echo ==== merchants (android) ====
SELECT id::text AS merchant_uuid, status, right(owner_user_id::text,12) AS owner_tail,
       (SELECT count(*) FROM orders o WHERE o.merchant_id=m.id) AS orders, m.created_at::date AS created
FROM merchants m WHERE android_profile_type IS NOT NULL ORDER BY m.created_at;
\echo ==== users (android) ====
SELECT id::text AS user_uuid, status, (google_sub IS NOT NULL) AS has_google, left(email,30) AS email, created_at::date AS created
FROM users WHERE account_origin='android_mobile' ORDER BY created_at;
\echo ==== devices ====
SELECT id::text AS device_uuid, right(user_id::text,12) AS user_tail, right(merchant_id::text,12) AS merchant_tail, status, created_at::date AS created
FROM android_merchant_devices ORDER BY created_at;
\echo ==== memberships (android merchants) ====
SELECT right(merchant_id::text,12) AS merchant_tail, right(user_id::text,12) AS user_tail, role, status
FROM merchant_memberships
WHERE merchant_id IN (SELECT id FROM merchants WHERE android_profile_type IS NOT NULL)
ORDER BY merchant_id;
