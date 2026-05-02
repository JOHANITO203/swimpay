CREATE TABLE bank_package_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  device_id UUID NOT NULL REFERENCES receiver_devices(id),
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  package_name TEXT NOT NULL,
  cert_sha256 TEXT NOT NULL,
  app_version TEXT,
  install_source TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_operator_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_reason TEXT,
  CONSTRAINT bank_package_evidence_source_check CHECK (source IN ('android_packagemanager', 'synthetic_debug_only')),
  CONSTRAINT bank_package_evidence_status_check CHECK (
    status IN ('pending_operator_review', 'approved_for_review_only', 'rejected', 'deprecated')
  ),
  CONSTRAINT bank_package_evidence_no_raw_text_check CHECK (
    package_name !~* 'raw_notification|notification_text|raw_body|raw_title'
    AND cert_sha256 !~* 'raw_notification|notification_text|raw_body|raw_title'
  )
);

CREATE UNIQUE INDEX unique_bank_package_evidence_observation
ON bank_package_evidence(merchant_id, device_id, bank_profile_id, package_name, cert_sha256, source);

CREATE INDEX idx_bank_package_evidence_status_created
ON bank_package_evidence(status, created_at DESC);

CREATE INDEX idx_bank_package_evidence_bank_profile
ON bank_package_evidence(bank_profile_id, status);
