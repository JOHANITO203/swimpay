ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS return_url text;

CREATE INDEX IF NOT EXISTS idx_orders_return_url_present
  ON orders (merchant_id, created_at DESC)
  WHERE return_url IS NOT NULL;
