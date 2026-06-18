\pset pager off
\echo ==== A. android overview (attendu: users 3, with_google 1, merchants 3) ====
SELECT (SELECT count(*) FROM users WHERE account_origin='android_mobile') AS android_users,
       (SELECT count(*) FROM users WHERE account_origin='android_mobile' AND google_sub IS NOT NULL) AS users_with_google,
       (SELECT count(*) FROM merchants WHERE android_profile_type IS NOT NULL) AS android_merchants;

\echo ==== B. comptes android Google-ancres (= ton nouveau compte GX/GM) ====
SELECT right(u.id::text,12) AS gx_user_tail, left(u.google_sub,14) AS sub_pfx, left(u.email,30) AS email,
       right(m.id::text,12) AS gm_merchant_tail, m.created_at
FROM users u JOIN merchants m ON m.owner_user_id=u.id
WHERE u.account_origin='android_mobile' AND u.google_sub IS NOT NULL
ORDER BY m.created_at DESC;

\echo ==== C. devices (le plus recent = ton device release courant GD) ====
SELECT right(id::text,12) AS device_tail, right(user_id::text,12) AS user_tail, right(merchant_id::text,12) AS merchant_tail,
       left(device_proof_hash,10) AS proof_pfx, status, created_at, last_seen_at
FROM android_merchant_devices ORDER BY created_at DESC LIMIT 6;
