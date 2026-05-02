CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'RU',
  status TEXT NOT NULL DEFAULT 'active',
  risk_tier TEXT NOT NULL DEFAULT 'standard',
  auto_confirm_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_confirm_limit_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, email)
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  external_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  product_risk_level TEXT NOT NULL DEFAULT 'low',
  amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, external_id)
);

CREATE TABLE payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  expected_amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL,
  buyer_phone_hmac TEXT,
  buyer_phone_masked TEXT,
  buyer_name_hmac TEXT,
  reference_code TEXT,
  reference_hmac TEXT,
  status TEXT NOT NULL,
  receiver_group_id UUID,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receiver_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  device_name TEXT,
  public_key TEXT NOT NULL,
  app_version TEXT,
  android_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  trust_score INTEGER NOT NULL DEFAULT 0,
  notification_access_status BOOLEAN NOT NULL DEFAULT false,
  last_local_counter BIGINT NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_profiles (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'RU',
  status TEXT NOT NULL DEFAULT 'learning',
  reliability_index NUMERIC(5,4) NOT NULL DEFAULT 0,
  unknown_rate_24h NUMERIC(5,4) NOT NULL DEFAULT 0,
  drift_rate_7d NUMERIC(5,4) NOT NULL DEFAULT 0,
  auto_confirm_status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_app_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  package_name TEXT NOT NULL,
  cert_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  UNIQUE (package_name, cert_sha256)
);

CREATE TABLE bank_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  locale TEXT NOT NULL,
  direction_label TEXT NOT NULL,
  canonical_title TEXT NOT NULL,
  canonical_body TEXT NOT NULL,
  template_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new',
  seen_count INTEGER NOT NULL DEFAULT 0,
  human_verified_count INTEGER NOT NULL DEFAULT 0,
  false_positive_count INTEGER NOT NULL DEFAULT 0,
  reliability_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  device_id UUID NOT NULL REFERENCES receiver_devices(id),
  bank_profile_id TEXT REFERENCES bank_profiles(id),
  event_id TEXT NOT NULL,
  notification_hash TEXT NOT NULL,
  semantic_hash TEXT,
  local_counter BIGINT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_minor BIGINT,
  currency TEXT,
  sender_phone_hmac TEXT,
  sender_phone_masked TEXT,
  reference_hmac TEXT,
  reference_code_masked TEXT,
  direction_label TEXT NOT NULL,
  signal_quality INTEGER NOT NULL DEFAULT 0,
  parser_version TEXT NOT NULL,
  template_id UUID REFERENCES bank_templates(id),
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id),
  UNIQUE (notification_hash)
);

CREATE TABLE signal_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES notification_signals(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  payment_session_id UUID NOT NULL REFERENCES payment_sessions(id),
  score INTEGER NOT NULL,
  decision TEXT NOT NULL,
  collision_detected BOOLEAN NOT NULL DEFAULT false,
  reasons_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  order_id UUID REFERENCES orders(id),
  payment_session_id UUID REFERENCES payment_sessions(id),
  signal_id UUID REFERENCES notification_signals(id),
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES review_queue(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  actor_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  feedback_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  enabled_events JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 7,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  last_http_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replay_of_delivery_id UUID REFERENCES webhook_deliveries(id),
  CONSTRAINT webhook_deliveries_status_check CHECK (status IN ('pending', 'delivering', 'delivered', 'failed', 'dead', 'cancelled'))
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID,
  event_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  payload_redacted JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_merchant_status ON orders(merchant_id, status);
CREATE INDEX idx_payment_sessions_active ON payment_sessions(merchant_id, status, valid_until);
CREATE INDEX idx_signals_merchant_observed ON notification_signals(merchant_id, observed_at);
CREATE INDEX idx_signals_amount_currency ON notification_signals(merchant_id, amount_minor, currency);
CREATE INDEX idx_reviews_open ON review_queue(merchant_id, status);
CREATE UNIQUE INDEX unique_webhook_delivery_endpoint_event
ON webhook_deliveries(endpoint_id, event_id)
WHERE replay_of_delivery_id IS NULL;

CREATE INDEX idx_webhook_due_claim
ON webhook_deliveries(status, next_retry_at, created_at)
WHERE status IN ('pending', 'failed');

CREATE UNIQUE INDEX unique_confirmed_order
ON signal_matches(order_id)
WHERE decision IN ('auto_confirmed', 'manual_confirmed');

CREATE UNIQUE INDEX unique_used_signal_confirmed
ON signal_matches(signal_id)
WHERE decision IN ('auto_confirmed', 'manual_confirmed');

INSERT INTO bank_profiles (id, bank_name, status, auto_confirm_status) VALUES
  ('sber_ru', 'Sberbank', 'learning', 'disabled'),
  ('tbank_ru', 'Tinkoff / T-Bank', 'learning', 'disabled'),
  ('vtb_ru', 'VTB Bank', 'learning', 'disabled'),
  ('alfa_ru', 'Alfa-Bank', 'learning', 'disabled'),
  ('gazprombank_ru', 'Gazprombank', 'learning', 'disabled');
