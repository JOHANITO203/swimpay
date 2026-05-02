-- Task 028: make manual review rejection scope explicit and auditable.
ALTER TABLE review_actions
  ADD COLUMN IF NOT EXISTS scope TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'review_actions_scope_check'
  ) THEN
    ALTER TABLE review_actions
      ADD CONSTRAINT review_actions_scope_check
      CHECK (scope IS NULL OR scope IN ('signal', 'payment_session', 'order'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_review_actions_review_action
ON review_actions(review_id, action, created_at DESC);
