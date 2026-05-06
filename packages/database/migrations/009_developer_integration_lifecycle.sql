CREATE TABLE IF NOT EXISTS merchant_integrations (
  merchant_id UUID PRIMARY KEY REFERENCES merchants(id),
  public_key TEXT NOT NULL UNIQUE,
  api_key_id UUID REFERENCES api_keys(id),
  secret_key_masked TEXT,
  secret_key_created_at TIMESTAMPTZ,
  secret_key_last_rotated_at TIMESTAMPTZ,
  webhook_endpoint_id UUID REFERENCES webhook_endpoints(id),
  webhook_secret_hash TEXT,
  webhook_secret_encrypted TEXT,
  webhook_secret_masked TEXT,
  webhook_secret_created_at TIMESTAMPTZ,
  webhook_secret_last_rotated_at TIMESTAMPTZ,
  webhook_url TEXT,
  webhook_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (webhook_status IN ('not_configured', 'active', 'problem')),
  integration_type TEXT NOT NULL DEFAULT 'both'
    CHECK (integration_type IN ('web', 'android', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_merchant_status
ON api_keys(merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_merchant_status
ON webhook_endpoints(merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_merchant_created
ON webhook_deliveries(merchant_id, created_at DESC);

ALTER TABLE webhook_endpoints
ADD COLUMN IF NOT EXISTS secret_encrypted TEXT;
