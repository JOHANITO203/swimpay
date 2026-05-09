ALTER TABLE notification_signals
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS package_cert_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS shape_hash TEXT,
  ADD COLUMN IF NOT EXISTS profile_version TEXT,
  ADD COLUMN IF NOT EXISTS classification TEXT,
  ADD COLUMN IF NOT EXISTS receiver_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS evidence_envelope_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notification_signals_shape_hash
  ON notification_signals(merchant_id, shape_hash)
  WHERE shape_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_signals_package_cert
  ON notification_signals(bank_profile_id, package_name, package_cert_sha256)
  WHERE package_name IS NOT NULL AND package_cert_sha256 IS NOT NULL;

ALTER TABLE signal_matches
  ADD COLUMN IF NOT EXISTS confidence_vector_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS collision_pressure INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS amount_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  payment_session_id UUID REFERENCES payment_sessions(id),
  route_id UUID,
  rail TEXT NOT NULL CHECK (rail IN ('sbp', 'card', 'phone_transfer', 'card_transfer')),
  display_amount_minor BIGINT NOT NULL CHECK (display_amount_minor > 0),
  reconciliation_delta_minor INTEGER NOT NULL CHECK (reconciliation_delta_minor BETWEEN 0 AND 99),
  payable_amount_minor BIGINT NOT NULL CHECK (payable_amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'RUB',
  status TEXT NOT NULL CHECK (status IN ('active', 'used', 'expired', 'released', 'collision')) DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_amount_leases_active_unique_amount
  ON amount_leases(merchant_id, route_id, rail, payable_amount_minor)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_amount_leases_session
  ON amount_leases(payment_session_id);

CREATE TABLE IF NOT EXISTS worker_idempotency_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT,
  event_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'failed', 'skipped')),
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_worker_idempotency_ledger_status
  ON worker_idempotency_ledger(service_name, status, updated_at);

CREATE TABLE IF NOT EXISTS bank_route_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id TEXT NOT NULL REFERENCES bank_profiles(id),
  package_name TEXT NOT NULL,
  accepted_signing_cert_sha256 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rail_supported TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  templates JSONB NOT NULL DEFAULT '[]'::jsonb,
  notification_reliability JSONB NOT NULL DEFAULT '{}'::jsonb,
  runtime_status TEXT NOT NULL CHECK (runtime_status IN ('certified', 'observed', 'experimental', 'review_only', 'package_validation_pending', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_id, package_name)
);

INSERT INTO bank_route_certifications (
  bank_id, package_name, rail_supported, templates, notification_reliability, runtime_status
)
VALUES
  ('sber_ru', 'ru.sberbankmobile', ARRAY['sbp', 'card'], '[]'::jsonb, '{"live_posted_seen": false, "active_sweep_seen": false}'::jsonb, 'observed'),
  ('tbank_ru', 'com.idamob.tinkoff.android', ARRAY['sbp', 'card'], '[]'::jsonb, '{"live_posted_seen": false, "active_sweep_seen": false}'::jsonb, 'observed'),
  ('vtb_ru', 'ru.vtb24.mobilebanking.android', ARRAY['sbp', 'card'], '[]'::jsonb, '{"live_posted_seen": false, "active_sweep_seen": false}'::jsonb, 'observed'),
  ('alfa_ru', 'ru.alfabank.mobile.android', ARRAY['sbp', 'card'], '[]'::jsonb, '{"live_posted_seen": false, "active_sweep_seen": false}'::jsonb, 'observed'),
  ('gazprombank_ru', 'ru.gazprombank.android.mobilebank.app', ARRAY['sbp', 'card'], '[]'::jsonb, '{"live_posted_seen": false, "active_sweep_seen": false}'::jsonb, 'observed'),
  ('ozon_bank', 'package_unknown', ARRAY[]::TEXT[], '[]'::jsonb, '{"live_posted_seen": false, "active_sweep_seen": false}'::jsonb, 'package_validation_pending')
ON CONFLICT (bank_id, package_name) DO UPDATE
SET rail_supported = EXCLUDED.rail_supported,
    notification_reliability = EXCLUDED.notification_reliability,
    runtime_status = EXCLUDED.runtime_status,
    updated_at = now();
