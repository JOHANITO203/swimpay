ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS selected_receiver_bank_id TEXT,
  ADD COLUMN IF NOT EXISTS selected_receiver_bank_profile_id TEXT REFERENCES bank_profiles(id),
  ADD COLUMN IF NOT EXISTS selected_payer_bank_launcher_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions_shown_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_claimed_paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payment_sessions_checkout_receiver_bank
  ON payment_sessions(merchant_id, selected_receiver_bank_profile_id)
  WHERE selected_receiver_bank_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_sessions_checkout_payer_launcher
  ON payment_sessions(merchant_id, selected_payer_bank_launcher_id)
  WHERE selected_payer_bank_launcher_id IS NOT NULL;
