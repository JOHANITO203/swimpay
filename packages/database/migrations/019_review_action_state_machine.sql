ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS receiver_arm_expires_at TIMESTAMPTZ;

UPDATE payment_sessions
SET receiver_arm_expires_at = valid_until
WHERE receiver_armed_at IS NOT NULL
  AND receiver_arm_expires_at IS NULL
  AND status NOT IN ('manual_confirmed', 'rejected', 'expired');

CREATE INDEX IF NOT EXISTS idx_payment_sessions_receiver_arm_window
ON payment_sessions(merchant_id, status, receiver_armed_at, receiver_arm_expires_at)
WHERE receiver_armed_at IS NOT NULL;
