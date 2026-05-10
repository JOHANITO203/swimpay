-- Reconciles staging databases that received the checkout/payment-compatibility
-- runtime code before every recent additive migration was applied manually.
--
-- This migration is intentionally idempotent. It does not drop data and it does
-- not change payment confirmation semantics.

ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS selected_receiving_route_id UUID REFERENCES merchant_receiving_routes(id),
  ADD COLUMN IF NOT EXISTS selected_payer_bank_launcher_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_sender_phone_hmac TEXT,
  ADD COLUMN IF NOT EXISTS buyer_sender_phone_masked TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS sender_bank_id TEXT,
  ADD COLUMN IF NOT EXISTS sender_card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS sender_card_masked TEXT,
  ADD COLUMN IF NOT EXISTS sender_card_hmac TEXT,
  ADD COLUMN IF NOT EXISTS sender_phone_masked TEXT,
  ADD COLUMN IF NOT EXISTS sender_phone_hmac TEXT,
  ADD COLUMN IF NOT EXISTS buyer_first_name_raw TEXT,
  ADD COLUMN IF NOT EXISTS buyer_last_name_raw TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_script_detected TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_latin_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_cyrillic_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_initial_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_reversed_order_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS display_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS payable_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS reconciliation_delta_minor BIGINT,
  ADD COLUMN IF NOT EXISTS expected_payment_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS receiver_armed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_notification_manual_check_requested_at TIMESTAMPTZ;

UPDATE payment_sessions
SET display_amount_minor = COALESCE(display_amount_minor, expected_amount_minor),
    payable_amount_minor = COALESCE(payable_amount_minor, expected_amount_minor),
    reconciliation_delta_minor = COALESCE(reconciliation_delta_minor, 0)
WHERE display_amount_minor IS NULL
   OR payable_amount_minor IS NULL
   OR reconciliation_delta_minor IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_expected_profile_amounts_ck'
  ) THEN
    ALTER TABLE payment_sessions
      ADD CONSTRAINT payment_sessions_expected_profile_amounts_ck
      CHECK (
        (display_amount_minor IS NULL OR display_amount_minor > 0)
        AND (payable_amount_minor IS NULL OR payable_amount_minor > 0)
        AND (reconciliation_delta_minor IS NULL OR reconciliation_delta_minor BETWEEN 0 AND 99)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_expected_profile_method_ck'
  ) THEN
    ALTER TABLE payment_sessions
      ADD CONSTRAINT payment_sessions_expected_profile_method_ck
      CHECK (
        payment_method IS NULL
        OR (
          payment_method = 'card'
          AND sender_card_hmac IS NOT NULL
          AND sender_card_last4 IS NOT NULL
          AND sender_card_masked IS NOT NULL
          AND sender_phone_hmac IS NULL
          AND sender_phone_masked IS NULL
        )
        OR (
          payment_method = 'sbp'
          AND sender_phone_hmac IS NOT NULL
          AND sender_phone_masked IS NOT NULL
          AND sender_card_hmac IS NULL
          AND sender_card_last4 IS NULL
          AND sender_card_masked IS NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_sessions_expected_profile
  ON payment_sessions(merchant_id, payment_method, sender_bank_id, status, valid_until);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_sessions_expected_fingerprint
  ON payment_sessions(merchant_id, expected_payment_fingerprint)
  WHERE expected_payment_fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_queue_no_notification_fallback_once
ON review_queue(payment_session_id)
WHERE reason_code = 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT';

CREATE INDEX IF NOT EXISTS idx_payment_sessions_no_notification_due
ON payment_sessions(merchant_id, status, receiver_armed_at)
WHERE no_notification_manual_check_requested_at IS NULL;

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

INSERT INTO bank_profiles (id, bank_name, status, auto_confirm_status)
VALUES ('ozon_bank', 'Ozon Bank', 'review_only', 'disabled')
ON CONFLICT (id) DO UPDATE
SET bank_name = EXCLUDED.bank_name,
    status = EXCLUDED.status,
    auto_confirm_status = 'disabled',
    updated_at = now();

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

ALTER TABLE merchant_receiving_routes
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pending_disable_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merchant_receiving_routes_lifecycle_status_ck'
  ) THEN
    ALTER TABLE merchant_receiving_routes
      ADD CONSTRAINT merchant_receiving_routes_lifecycle_status_ck
      CHECK (lifecycle_status IN ('active', 'pending_disable', 'disabled', 'revoked', 'deleted'));
  END IF;
END $$;

UPDATE merchant_receiving_routes
SET lifecycle_status = CASE
    WHEN deleted_at IS NOT NULL THEN 'deleted'
    WHEN enabled = false THEN 'disabled'
    ELSE lifecycle_status
  END,
  disabled_at = CASE
    WHEN deleted_at IS NULL AND enabled = false AND disabled_at IS NULL THEN updated_at
    ELSE disabled_at
  END
WHERE lifecycle_status = 'active'
  AND (deleted_at IS NOT NULL OR enabled = false);

ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS route_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS route_lock_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_lease_id UUID REFERENCES amount_leases(id);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_active_route_locks
  ON payment_sessions(merchant_id, selected_receiving_route_id, route_lock_expires_at)
  WHERE selected_receiving_route_id IS NOT NULL
    AND route_lock_expires_at IS NOT NULL
    AND status NOT IN ('manual_confirmed', 'rejected', 'expired');

CREATE INDEX IF NOT EXISTS idx_merchant_receiving_routes_lifecycle_visible
  ON merchant_receiving_routes(merchant_id, lifecycle_status, enabled, bank_profile_id)
  WHERE deleted_at IS NULL;
