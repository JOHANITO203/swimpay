-- 028 — Dedup marker for payment.currency_mismatch notifications: a signal
-- notifies the merchant at most once. Additive and idempotent.
ALTER TABLE notification_signals
  ADD COLUMN IF NOT EXISTS currency_mismatch_notified_at TIMESTAMPTZ;
