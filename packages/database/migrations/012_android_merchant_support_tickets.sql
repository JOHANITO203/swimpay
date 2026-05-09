CREATE TABLE IF NOT EXISTS android_merchant_support_tickets (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'receiver_issue',
    'payment_review_issue',
    'integration_webhook_issue',
    'account_security_issue',
    'other'
  )),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  safe_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('created', 'closed')) DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_android_merchant_support_tickets_merchant_created
  ON android_merchant_support_tickets(merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_android_merchant_support_tickets_status
  ON android_merchant_support_tickets(status);
