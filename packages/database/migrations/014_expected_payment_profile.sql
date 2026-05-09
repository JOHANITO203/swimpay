ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('card', 'sbp')),
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
  ADD COLUMN IF NOT EXISTS expected_payment_fingerprint TEXT;

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
