ALTER TABLE merchant_receiving_routes
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pending_disable_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merchant_receiving_routes_lifecycle_status_ck'
  ) THEN
    ALTER TABLE merchant_receiving_routes
      ADD CONSTRAINT merchant_receiving_routes_lifecycle_status_ck
      CHECK (lifecycle_status IN ('active', 'pending_disable', 'disabled', 'revoked', 'deleted'));
  END IF;
END $$;

UPDATE merchant_receiving_routes
SET lifecycle_status = CASE
    WHEN deleted_at IS NOT NULL THEN 'deleted'
    WHEN enabled = false THEN 'disabled'
    ELSE lifecycle_status
  END,
  disabled_at = CASE
    WHEN deleted_at IS NULL AND enabled = false AND disabled_at IS NULL THEN updated_at
    ELSE disabled_at
  END
WHERE lifecycle_status = 'active'
  AND (deleted_at IS NOT NULL OR enabled = false);

ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS route_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS route_lock_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_lease_id UUID REFERENCES amount_leases(id);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_active_route_locks
  ON payment_sessions(merchant_id, selected_receiving_route_id, route_lock_expires_at)
  WHERE selected_receiving_route_id IS NOT NULL
    AND route_lock_expires_at IS NOT NULL
    AND status NOT IN ('manual_confirmed', 'rejected', 'expired');

CREATE INDEX IF NOT EXISTS idx_merchant_receiving_routes_lifecycle_visible
  ON merchant_receiving_routes(merchant_id, lifecycle_status, enabled, bank_profile_id)
  WHERE deleted_at IS NULL;
