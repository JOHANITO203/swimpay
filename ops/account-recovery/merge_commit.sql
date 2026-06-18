\pset pager off
\set R    'd8db6373-ecbc-4174-a9fa-1a29f0caca73'
\set OU   '318ce516-578a-4bdb-b18f-251683d8849e'
\set ROLD '2e3f1dfe-50d6-4e99-a581-8f66f27c1306'
\set GX   'b3daf09a-d7d7-4044-9df5-c4452fe220d8'
\set GM   '302389f9-532e-4fe0-b355-e69b348680ad'
\set GD   '7f5a6a2e-8be8-4a06-bebf-8fd3f6dd4337'
\set D    '105e4e1f-506f-427d-b299-b0cfd302edb1'
\set DU   'c7bb0dff-8e79-48b0-b2aa-3f60c79b368d'
\set DDEV 'ad3b89ab-558e-4073-9c1d-f323cbbc9315'

BEGIN;
UPDATE merchants SET owner_user_id = :'GX', updated_at = now() WHERE id = :'R';
UPDATE merchant_memberships SET user_id = :'GX', updated_at = now()
 WHERE merchant_id = :'R' AND user_id = :'OU' AND role = 'owner';
UPDATE android_merchant_devices SET merchant_id = :'R', updated_at = now() WHERE id = :'GD';
UPDATE android_merchant_sessions SET revoked_at = now() WHERE device_id = :'GD' AND revoked_at IS NULL;
UPDATE merchants SET status='revoked', updated_at=now() WHERE id IN (:'GM', :'D');
UPDATE users     SET status='disabled', updated_at=now() WHERE id IN (:'OU', :'DU');
UPDATE android_merchant_devices SET status='revoked', updated_at=now() WHERE id IN (:'ROLD', :'DDEV');
UPDATE android_merchant_sessions SET revoked_at=now() WHERE merchant_id IN (:'GM', :'D') AND revoked_at IS NULL;
UPDATE merchant_memberships SET status='disabled', updated_at=now() WHERE merchant_id = :'GM' AND user_id = :'GX';
COMMIT;

\echo ==== POST-COMMIT VERIFY ====
SELECT right(id::text,12) merchant, status, right(owner_user_id::text,12) owner_tail,
       (SELECT count(*) FROM orders o WHERE o.merchant_id=m.id) orders FROM merchants m WHERE id=:'R';
SELECT right(id::text,12) usr, status, (google_sub IS NOT NULL) has_google, left(email,28) email FROM users WHERE id=:'GX';
SELECT right(id::text,12) device, right(user_id::text,12) user_tail, right(merchant_id::text,12) merchant_tail, status FROM android_merchant_devices WHERE id=:'GD';
SELECT right(merchant_id::text,12) merchant, right(user_id::text,12) user_tail, role, status FROM merchant_memberships WHERE merchant_id=:'R';
SELECT (SELECT count(*) FROM merchants WHERE android_profile_type IS NOT NULL AND status='active') active_merchants,
       (SELECT count(*) FROM users WHERE account_origin='android_mobile' AND status='active') active_users;
\echo ==== MERGE COMMITTED ====
