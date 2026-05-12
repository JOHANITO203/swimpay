-- Marks Ozon Bank as operator runtime-verified for V1 manual-review-only use.
-- Runtime verified means selectable/observable capability only; it never enables auto-confirmation.

ALTER TABLE bank_profiles
  ADD COLUMN IF NOT EXISTS selectable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supported_roles TEXT[] NOT NULL DEFAULT ARRAY['sender_bank', 'receiver_bank'],
  ADD COLUMN IF NOT EXISTS runtime_capture_status TEXT NOT NULL DEFAULT 'observed',
  ADD COLUMN IF NOT EXISTS runtime_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS runtime_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS runtime_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS runtime_evidence_source TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS package_cert_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS logo_asset TEXT,
  ADD COLUMN IF NOT EXISTS official_bank_confirmation BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE bank_route_certifications
  ADD COLUMN IF NOT EXISTS runtime_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS runtime_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS runtime_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS runtime_evidence_source TEXT,
  ADD COLUMN IF NOT EXISTS logo_asset TEXT;

INSERT INTO bank_profiles (
  id,
  bank_name,
  country,
  status,
  auto_confirm_status,
  selectable,
  supported_roles,
  runtime_capture_status,
  runtime_verified,
  runtime_verified_by,
  runtime_verified_at,
  runtime_evidence_source,
  package_name,
  package_cert_sha256,
  logo_asset,
  official_bank_confirmation
) VALUES (
  'ozon_bank',
  'Ozon Банк',
  'RU',
  'review_only',
  'disabled',
  true,
  ARRAY['sender_bank', 'receiver_bank'],
  'runtime_verified',
  true,
  'operator',
  '2026-05-12T00:00:00.000Z'::timestamptz,
  'operator_runtime_test',
  'ru.ozon.fintech.finance',
  'documented_unknown',
  'ic_bank_ozon',
  false
)
ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  country = EXCLUDED.country,
  status = 'review_only',
  auto_confirm_status = 'disabled',
  selectable = EXCLUDED.selectable,
  supported_roles = EXCLUDED.supported_roles,
  runtime_capture_status = EXCLUDED.runtime_capture_status,
  runtime_verified = EXCLUDED.runtime_verified,
  runtime_verified_by = EXCLUDED.runtime_verified_by,
  runtime_verified_at = EXCLUDED.runtime_verified_at,
  runtime_evidence_source = EXCLUDED.runtime_evidence_source,
  package_name = EXCLUDED.package_name,
  package_cert_sha256 = EXCLUDED.package_cert_sha256,
  logo_asset = EXCLUDED.logo_asset,
  official_bank_confirmation = false,
  updated_at = now();

INSERT INTO bank_route_certifications (
  bank_id,
  package_name,
  rail_supported,
  templates,
  notification_reliability,
  runtime_status,
  runtime_verified,
  runtime_verified_by,
  runtime_verified_at,
  runtime_evidence_source,
  logo_asset
) VALUES (
  'ozon_bank',
  'ru.ozon.fintech.finance',
  ARRAY['sbp', 'card'],
  '[]'::jsonb,
  '{"live_posted_seen": false, "active_sweep_seen": false, "runtime_verified_by_operator": true}'::jsonb,
  'observed',
  true,
  'operator',
  '2026-05-12T00:00:00.000Z'::timestamptz,
  'operator_runtime_test',
  'ic_bank_ozon'
)
ON CONFLICT (bank_id, package_name) DO UPDATE SET
  rail_supported = EXCLUDED.rail_supported,
  templates = EXCLUDED.templates,
  notification_reliability = EXCLUDED.notification_reliability,
  runtime_status = EXCLUDED.runtime_status,
  runtime_verified = EXCLUDED.runtime_verified,
  runtime_verified_by = EXCLUDED.runtime_verified_by,
  runtime_verified_at = EXCLUDED.runtime_verified_at,
  runtime_evidence_source = EXCLUDED.runtime_evidence_source,
  logo_asset = EXCLUDED.logo_asset;
