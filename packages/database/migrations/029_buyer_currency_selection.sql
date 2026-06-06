-- 029 — Buyer currency selection on payment sessions. All nullable; legacy
-- sessions never set them. base_* freeze the creation-time currency/amount so
-- re-selections always re-quote from the base, never from the previous choice.
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS base_currency TEXT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS base_amount_minor BIGINT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS buyer_fx_rate TEXT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS buyer_fx_source TEXT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS buyer_fx_timestamp TIMESTAMPTZ;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS currency_selected_at TIMESTAMPTZ;
