ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS last_http_status INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS replay_of_delivery_id UUID REFERENCES webhook_deliveries(id);

UPDATE webhook_deliveries
SET status = 'failed'
WHERE status = 'retrying';

ALTER TABLE webhook_deliveries
  DROP CONSTRAINT IF EXISTS webhook_deliveries_status_check;

ALTER TABLE webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_status_check
  CHECK (status IN ('pending', 'delivering', 'delivered', 'failed', 'dead', 'cancelled'));

ALTER TABLE webhook_deliveries
  DROP CONSTRAINT IF EXISTS webhook_deliveries_endpoint_id_event_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS unique_webhook_delivery_endpoint_event
ON webhook_deliveries(endpoint_id, event_id)
WHERE replay_of_delivery_id IS NULL;

DROP INDEX IF EXISTS idx_webhook_due;

CREATE INDEX IF NOT EXISTS idx_webhook_due_claim
ON webhook_deliveries(status, next_retry_at, created_at)
WHERE status IN ('pending', 'failed');
