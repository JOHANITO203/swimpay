ALTER TABLE review_actions
  ADD COLUMN IF NOT EXISTS actor_type TEXT,
  ADD COLUMN IF NOT EXISTS actor_source TEXT,
  ADD COLUMN IF NOT EXISTS actor_display TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'review_actions_actor_type_check'
  ) THEN
    ALTER TABLE review_actions
      ADD CONSTRAINT review_actions_actor_type_check
      CHECK (
        actor_type IS NULL OR actor_type IN (
          'android_merchant',
          'dashboard_merchant',
          'system',
          'job_worker',
          'receiver_device',
          'admin'
        )
      );
  END IF;
END $$;

UPDATE review_actions
SET actor_type = 'dashboard_merchant'
WHERE actor_type IS NULL
  AND actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_actions_actor_type_created
ON review_actions(merchant_id, actor_type, created_at DESC);
