-- Phase 2.1 — West Africa receiving machinery (additive, inert until WA bank
-- profiles exist in 2.2 and the buyer-side gate opens in 2.3). Existing RU
-- routes are untouched: they keep rail_type phone_transfer/card_transfer and
-- default to RUB.

-- 1. Allow a mobile_money receiving rail (mobile money account = phone number,
--    so receiver_identifier_type 'phone' already covers it).
ALTER TABLE merchant_receiving_routes
  DROP CONSTRAINT IF EXISTS merchant_receiving_routes_rail_type_check;
ALTER TABLE merchant_receiving_routes
  ADD CONSTRAINT merchant_receiving_routes_rail_type_check
  CHECK (rail_type IN ('phone_transfer', 'card_transfer', 'mobile_money'));

-- 2. A receiving route now carries the currency it can collect. Every existing
--    route is a Russian rail, so RUB is the safe backfill default.
ALTER TABLE merchant_receiving_routes
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'RUB';

CREATE INDEX IF NOT EXISTS idx_merchant_receiving_routes_merchant_currency
  ON merchant_receiving_routes(merchant_id, currency);

-- 3. Bank profiles can be region/currency scoped. NULL = legacy RU (implicit
--    RUB); West Africa profiles added in 2.2 will set XOF.
ALTER TABLE bank_profiles
  ADD COLUMN IF NOT EXISTS currency TEXT;
