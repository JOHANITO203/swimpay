-- 026 — Wallet rail (international USD neobanks) + FX detection trace on orders.
-- Mirrors 024's pattern: widen CHECK domains, additive nullable columns.
--
-- receiver_identifier_type was created as an inline (unnamed) CHECK in
-- 007_hybrid_receiving_routes.sql; Postgres auto-names it
-- merchant_receiving_routes_receiver_identifier_type_check.  The
-- DROP CONSTRAINT IF EXISTS pattern (used by 024 for rail_type_check) works
-- identically for auto-named constraints, so no DO-block is needed.

-- 1. wallet_transfer joins the receiving rail domain.
ALTER TABLE merchant_receiving_routes
  DROP CONSTRAINT IF EXISTS merchant_receiving_routes_rail_type_check;
ALTER TABLE merchant_receiving_routes
  ADD CONSTRAINT merchant_receiving_routes_rail_type_check
  CHECK (rail_type IN ('phone_transfer', 'card_transfer', 'mobile_money', 'wallet_transfer'));

-- 2. Wallet identifiers: email (Wise/Payoneer) or tag (Wisetag/Revtag), besides phone/card.
ALTER TABLE merchant_receiving_routes
  DROP CONSTRAINT IF EXISTS merchant_receiving_routes_receiver_identifier_type_check;
ALTER TABLE merchant_receiving_routes
  ADD CONSTRAINT merchant_receiving_routes_receiver_identifier_type_check
  CHECK (receiver_identifier_type IN ('phone', 'card', 'email', 'tag'));

-- 3. FX / detection trace. NULL for explicit-amount orders (the V1 default).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS detection_source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS detection_raw_input TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_currency TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_amount_minor BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fx_rate TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fx_rate_timestamp TIMESTAMPTZ;
