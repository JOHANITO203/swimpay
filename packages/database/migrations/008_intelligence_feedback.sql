CREATE TABLE IF NOT EXISTS intelligence_feedback (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  shape_hash TEXT NOT NULL,
  bank_profile_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  profile_version TEXT NOT NULL,
  classification_guess TEXT NOT NULL,
  human_label TEXT NOT NULL,
  feedback TEXT NOT NULL,
  feedback_timestamp TIMESTAMPTZ NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  learning_context TEXT NOT NULL,
  intent_relation TEXT NOT NULL,
  active_payment_intent_present BOOLEAN NOT NULL DEFAULT false,
  collision_detected BOOLEAN NOT NULL DEFAULT false,
  payment_window_status TEXT NOT NULL DEFAULT 'none',
  review_created BOOLEAN NOT NULL DEFAULT false,
  mutates_runtime_rules BOOLEAN NOT NULL DEFAULT false CHECK (mutates_runtime_rules = false),
  promotes_profile BOOLEAN NOT NULL DEFAULT false CHECK (promotes_profile = false),
  official_bank_confirmation BOOLEAN NOT NULL DEFAULT false CHECK (official_bank_confirmation = false),
  creates_payment_review BOOLEAN NOT NULL DEFAULT false CHECK (creates_payment_review = false),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (review_status IN ('pending', 'accepted', 'rejected', 'duplicate')),
  CHECK (learning_context IN ('intent_bound_feedback', 'background_observation')),
  CHECK (intent_relation IN (
    'expected_payment_candidate',
    'ambiguous_activity',
    'unrelated_bank_activity',
    'negative_activity',
    'unknown_activity',
    'late_payment_candidate'
  )),
  CHECK (payment_window_status IN ('active', 'expired', 'none')),
  CHECK (shape_hash !~* '(raw|phone|card|notification_text|body|title|cvv|password|pin)')
);

CREATE INDEX IF NOT EXISTS idx_intelligence_feedback_merchant_created
  ON intelligence_feedback (merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_feedback_shape
  ON intelligence_feedback (shape_hash, bank_profile_id, package_name);

CREATE TABLE IF NOT EXISTS intelligence_unknown_shapes (
  merchant_id TEXT NOT NULL,
  shape_hash TEXT NOT NULL,
  bank_profile_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  profile_version TEXT NOT NULL,
  classification_guess TEXT NOT NULL DEFAULT 'unknown',
  seen_count INTEGER NOT NULL DEFAULT 1 CHECK (seen_count > 0),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  learning_context TEXT NOT NULL DEFAULT 'background_observation',
  read_only BOOLEAN NOT NULL DEFAULT true CHECK (read_only = true),
  mutates_runtime_rules BOOLEAN NOT NULL DEFAULT false CHECK (mutates_runtime_rules = false),
  promotes_profile BOOLEAN NOT NULL DEFAULT false CHECK (promotes_profile = false),
  official_bank_confirmation BOOLEAN NOT NULL DEFAULT false CHECK (official_bank_confirmation = false),
  creates_payment_review BOOLEAN NOT NULL DEFAULT false CHECK (creates_payment_review = false),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, shape_hash, bank_profile_id, package_name),
  CHECK (classification_guess = 'unknown'),
  CHECK (review_status IN ('pending', 'accepted', 'rejected', 'duplicate')),
  CHECK (learning_context = 'background_observation'),
  CHECK (last_seen_at >= first_seen_at),
  CHECK (shape_hash !~* '(raw|phone|card|notification_text|body|title|cvv|password|pin)')
);

CREATE INDEX IF NOT EXISTS idx_intelligence_unknown_shapes_last_seen
  ON intelligence_unknown_shapes (last_seen_at DESC);
