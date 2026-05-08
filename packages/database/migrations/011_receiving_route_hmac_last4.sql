ALTER TABLE merchant_receiving_routes
  ADD COLUMN IF NOT EXISTS receiver_identifier_hmac TEXT,
  ADD COLUMN IF NOT EXISTS receiver_identifier_last4 TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS unique_merchant_receiving_route_identifier_hmac
  ON merchant_receiving_routes(merchant_id, rail_type, receiver_identifier_hmac)
  WHERE receiver_identifier_hmac IS NOT NULL;
