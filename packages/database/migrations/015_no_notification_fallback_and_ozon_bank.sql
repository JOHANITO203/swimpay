ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS receiver_armed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_notification_manual_check_requested_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_queue_no_notification_fallback_once
ON review_queue(payment_session_id)
WHERE reason_code = 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT';

CREATE INDEX IF NOT EXISTS idx_payment_sessions_no_notification_due
ON payment_sessions(merchant_id, status, receiver_armed_at)
WHERE no_notification_manual_check_requested_at IS NULL;

INSERT INTO bank_profiles (id, bank_name, status, auto_confirm_status)
VALUES ('ozon_bank', 'Ozon Банк', 'review_only', 'disabled')
ON CONFLICT (id) DO UPDATE
SET bank_name = EXCLUDED.bank_name,
    status = EXCLUDED.status,
    auto_confirm_status = 'disabled',
    updated_at = now();
