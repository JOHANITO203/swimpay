CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);

UPDATE merchants
SET business_name = COALESCE(business_name, name)
WHERE business_name IS NULL;

CREATE TABLE IF NOT EXISTS merchant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL
    CHECK (role IN ('owner', 'admin', 'developer', 'operator', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_memberships_user_status
ON merchant_memberships(user_id, status);

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL
    CHECK (role IN ('swimpay_admin', 'support_operator', 'risk_operator', 'developer_ops', 'readonly_auditor')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_status
ON admin_roles(user_id, status);

CREATE TABLE IF NOT EXISTS bff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  active_merchant_id UUID REFERENCES merchants(id),
  expires_at TIMESTAMPTZ NOT NULL,
  csrf_secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bff_sessions_user_active
ON bff_sessions(user_id, active_merchant_id, expires_at)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bff_sessions_expiry
ON bff_sessions(expires_at)
WHERE revoked_at IS NULL;

