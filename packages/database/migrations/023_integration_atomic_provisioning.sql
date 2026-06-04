ALTER TABLE merchant_integrations
ADD COLUMN IF NOT EXISTS secret_key_encrypted TEXT;

CREATE TABLE IF NOT EXISTS merchant_secret_reveal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  revealed_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_secret_reveal_audit_merchant_created
ON merchant_secret_reveal_audit(merchant_id, created_at DESC);
