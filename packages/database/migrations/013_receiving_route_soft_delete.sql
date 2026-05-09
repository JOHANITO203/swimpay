ALTER TABLE merchant_receiving_routes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP INDEX IF EXISTS unique_merchant_receiving_route_identifier_hmac;

CREATE UNIQUE INDEX IF NOT EXISTS unique_merchant_receiving_route_identifier_hmac
  ON merchant_receiving_routes(merchant_id, rail_type, receiver_identifier_hmac)
  WHERE receiver_identifier_hmac IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_merchant_receiving_routes_active_visible
  ON merchant_receiving_routes(merchant_id, bank_profile_id, enabled)
  WHERE deleted_at IS NULL;
