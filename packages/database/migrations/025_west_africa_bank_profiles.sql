-- Phase 2.2 — West Africa receiving bank profiles (UEMOA / XOF). Manual-review
-- only, mobile-money/account receiving on the merchant side. Mirrors the payer
-- launcher providers so a buyer method has a receiving counterpart. Additive
-- and idempotent; existing RU profiles untouched.

INSERT INTO bank_profiles (
  id, bank_name, country, currency, status, auto_confirm_status,
  selectable, supported_roles, runtime_capture_status, runtime_verified,
  package_name, package_cert_sha256, logo_asset, official_bank_confirmation
) VALUES
  ('orange_money_sn', 'Orange Money (Senegal)',        'SN', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_orange_money', false),
  ('orange_money_ci', 'Orange Money (Cote d''Ivoire)',  'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_orange_money', false),
  ('wave_sn',         'Wave (Senegal)',                 'SN', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_wave', false),
  ('mtn_momo_ci',     'MTN MoMo (Cote d''Ivoire)',       'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_mtn_momo', false),
  ('moov_money_ci',   'Moov Money (Cote d''Ivoire)',     'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_moov', false),
  ('free_money_sn',   'Free Money / Mixx by Yas (Senegal)', 'SN', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_free_money', false),
  ('wizall_sn',       'Wizall Money (Senegal)',         'SN', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_wizall', false),
  ('djamo_ci',        'Djamo (Cote d''Ivoire)',          'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_djamo', false),
  ('ecobank_ci',      'Ecobank (Cote d''Ivoire)',        'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_ecobank', false),
  ('sg_connect_ci',   'SG Connect (Cote d''Ivoire)',     'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'documented_unknown', 'documented_unknown', 'ic_bank_sg', false)
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
