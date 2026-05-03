ALTER TABLE bank_package_evidence
  ADD COLUMN IF NOT EXISTS production_trust_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_trust_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS production_trust_reason TEXT,
  ADD COLUMN IF NOT EXISTS production_trust_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_trust_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS production_trust_approval_reason TEXT,
  ADD COLUMN IF NOT EXISTS production_trust_revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_trust_revoked_by TEXT,
  ADD COLUMN IF NOT EXISTS production_trust_revocation_reason TEXT;

ALTER TABLE bank_package_evidence
  DROP CONSTRAINT IF EXISTS bank_package_evidence_status_check;

ALTER TABLE bank_package_evidence
  ADD CONSTRAINT bank_package_evidence_status_check CHECK (
    status IN (
      'pending_operator_review',
      'approved_for_review_only',
      'rejected',
      'deprecated',
      'production_trust_requested',
      'production_trust_approved',
      'production_trust_revoked'
    )
  );

CREATE INDEX IF NOT EXISTS idx_bank_package_evidence_production_trust
ON bank_package_evidence(status, production_trust_requested_at DESC, production_trust_approved_at DESC)
WHERE status IN ('production_trust_requested', 'production_trust_approved', 'production_trust_revoked');
