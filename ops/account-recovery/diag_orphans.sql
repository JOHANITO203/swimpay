\pset pager off
\echo ==== 1. ANDROID ACCOUNT OVERVIEW ====
SELECT
 (SELECT count(*) FROM users WHERE account_origin='android_mobile') AS android_users,
 (SELECT count(*) FROM users WHERE account_origin='android_mobile' AND google_sub IS NULL) AS users_no_google,
 (SELECT count(*) FROM users WHERE account_origin='android_mobile' AND google_sub IS NOT NULL) AS users_with_google,
 (SELECT count(*) FROM merchants WHERE android_profile_type IS NOT NULL) AS android_merchants,
 (SELECT count(*) FROM android_merchant_devices) AS devices_total,
 (SELECT count(*) FROM android_merchant_devices WHERE status<>'revoked') AS devices_active;

\echo ==== 2. MERCHANTS PER GOOGLE_SUB (>1 = pre-fix duplicates on a real account) ====
SELECT u.google_sub, count(DISTINCT m.id) AS merchants, array_agg(DISTINCT m.id::text) AS merchant_ids
FROM users u JOIN merchants m ON m.owner_user_id=u.id
WHERE u.google_sub IS NOT NULL AND m.android_profile_type IS NOT NULL
GROUP BY u.google_sub HAVING count(DISTINCT m.id) > 1;

\echo ==== 3. ANDROID MERCHANTS: owner google status + activity ====
SELECT m.id AS merchant_id, left(m.name,22) AS name, m.status,
 m.created_at::date AS created,
 (u.google_sub IS NOT NULL) AS owner_google,
 left(u.email,28) AS owner_email,
 (SELECT count(*) FROM android_merchant_devices d WHERE d.merchant_id=m.id) AS devices,
 (SELECT count(*) FROM android_merchant_sessions s WHERE s.merchant_id=m.id) AS sessions
FROM merchants m JOIN users u ON u.id=m.owner_user_id
WHERE m.android_profile_type IS NOT NULL
ORDER BY owner_google, m.created_at;

\echo ==== 4. PAYMENT/SIGNAL/ORDER TABLES (discover names for activity check) ====
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND (table_name ~ 'payment|signal|intent|order|webhook')
ORDER BY table_name;
