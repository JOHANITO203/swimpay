-- 027 — International USD neobank receiving profiles + West Africa reduction.
-- Reduction is NON-destructive: retired profiles become unselectable, their
-- merchant routes go pending_disable. Nothing is deleted.
--
-- Schema verification notes:
--   bank_profiles.country  — TEXT NOT NULL DEFAULT 'RU', no CHECK constraint.
--                            'INT' is accepted (verified: no domain check exists).
--   bank_profiles.currency — nullable TEXT added in 024, no CHECK constraint. Fine.
--   bank_profiles.status   — TEXT NOT NULL, no CHECK constraint; 'review_only'
--                            already used in 025. Fine.
--   lifecycle_status       — CHECK domain (017) includes 'pending_disable'. Fine.
--   Column order mirrors 025 exactly (id, bank_name, country, currency, status,
--   auto_confirm_status, selectable, supported_roles, runtime_capture_status,
--   runtime_verified, package_name, package_cert_sha256, logo_asset,
--   official_bank_confirmation).

INSERT INTO bank_profiles (
  id, bank_name, country, currency, status, auto_confirm_status,
  selectable, supported_roles, runtime_capture_status, runtime_verified,
  package_name, package_cert_sha256, logo_asset, official_bank_confirmation
) VALUES
  ('wise_int',     'Wise',                         'INT', 'USD', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.transferwise.android', 'documented_unknown', 'ic_bank_wise',     false),
  ('revolut_int',  'Revolut',                      'INT', 'USD', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.revolut.revolut',      'documented_unknown', 'ic_bank_revolut',  false),
  ('payoneer_int', 'Payoneer',                     'INT', 'USD', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.payoneer.android',     'documented_unknown', 'ic_bank_payoneer', false),
  ('wave_ci',      'Wave (Cote d''Ivoire)',         'CI',  'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.wave.personal',        'documented_unknown', 'ic_bank_wave',     false)
ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  status = 'review_only',
  auto_confirm_status = 'disabled',
  selectable = EXCLUDED.selectable,
  supported_roles = EXCLUDED.supported_roles,
  logo_asset = EXCLUDED.logo_asset,
  official_bank_confirmation = false,
  updated_at = now();

-- West Africa reduction: retire everything but orange_money_ci / mtn_momo_ci / wave_ci.
UPDATE bank_profiles
SET selectable = false, updated_at = now()
WHERE id IN ('orange_money_sn', 'wave_sn', 'free_money_sn', 'wizall_sn',
             'moov_money_ci', 'djamo_ci', 'ecobank_ci', 'sg_connect_ci');

UPDATE merchant_receiving_routes
SET lifecycle_status = 'pending_disable', updated_at = now()
WHERE bank_profile_id IN ('orange_money_sn', 'wave_sn', 'free_money_sn', 'wizall_sn',
                          'moov_money_ci', 'djamo_ci', 'ecobank_ci', 'sg_connect_ci')
  AND lifecycle_status = 'active';
