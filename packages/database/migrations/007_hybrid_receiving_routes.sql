CREATE TABLE IF NOT EXISTS merchant_receiving_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  rail_type TEXT NOT NULL CHECK (rail_type IN ('phone_transfer', 'card_transfer')),
  receiver_identifier_type TEXT NOT NULL CHECK (receiver_identifier_type IN ('phone', 'card')),
  receiver_identifier_encrypted TEXT NOT NULL,
  receiver_identifier_masked TEXT NOT NULL,
  route_code TEXT NOT NULL,
  display_label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  recommended BOOLEAN NOT NULL DEFAULT false,
  review_policy TEXT NOT NULL CHECK (review_policy IN ('review_first', 'eligible_low_risk_later')),
  fees_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, route_code)
);

ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS selected_receiving_route_id UUID REFERENCES merchant_receiving_routes(id),
  ADD COLUMN IF NOT EXISTS buyer_sender_phone_hmac TEXT,
  ADD COLUMN IF NOT EXISTS buyer_sender_phone_masked TEXT;

CREATE INDEX IF NOT EXISTS idx_merchant_receiving_routes_merchant_bank_enabled
  ON merchant_receiving_routes(merchant_id, bank_profile_id, enabled);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_selected_receiving_route
  ON payment_sessions(merchant_id, selected_receiving_route_id)
  WHERE selected_receiving_route_id IS NOT NULL;
