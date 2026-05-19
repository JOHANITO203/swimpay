# 05 — Database Schema

PostgreSQL is the source of truth.

This document defines the V1 schema. Migrations must follow this model unless an ADR changes the decision.

## Enums

```text
order_status:
created, awaiting_buyer_identity, payment_session_created, receiver_arming,
receiver_armed, payment_instructions_shown, awaiting_payment, buyer_claimed_paid,
signal_detected, matching, needs_review, manual_confirmed,
rejected, expired, fulfilled

payment_session_status:
created, receiver_arming, receiver_armed, awaiting_payment, buyer_claimed_paid,
signal_detected, matching, needs_review, manual_confirmed,
rejected, expired

bank_profile_status:
learning, shadow_testing, trusted_low_amount, trusted, degraded, review_only, disabled

direction_label:
incoming_customer_transfer, incoming_cashback, incoming_refund, outgoing_payment,
failed_transfer, promo, balance_update, unknown, unknown_ambiguous_direction

decision:
needs_review, rejected, wait

review_status:
open, confirmed, rejected, cancelled

webhook_delivery_status:
pending, delivering, delivered, failed, dead, cancelled
```

## Tables

### `merchants`

```sql
CREATE TABLE merchants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'RU',
  status TEXT NOT NULL DEFAULT 'active',
  risk_tier TEXT NOT NULL DEFAULT 'standard',
  auto_confirm_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_confirm_limit_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `api_keys`

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
```

### `orders`

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  external_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  product_risk_level TEXT NOT NULL DEFAULT 'low',
  amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, external_id)
);
```

### `payment_sessions`

```sql
CREATE TABLE payment_sessions (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  expected_amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL,
  buyer_phone_hmac TEXT,
  buyer_phone_masked TEXT,
  buyer_name_hmac TEXT,
  reference_code TEXT,
  reference_hmac TEXT,
  status TEXT NOT NULL,
  receiver_group_id UUID,
  selected_receiver_bank_id TEXT,
  selected_receiver_bank_profile_id TEXT REFERENCES bank_profiles(id),
  selected_payer_bank_launcher_id TEXT,
  payment_instructions_shown_at TIMESTAMPTZ,
  receiver_armed_at TIMESTAMPTZ,
  receiver_arm_expires_at TIMESTAMPTZ,
  buyer_claimed_paid_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Sprint 7B adds hybrid receiving route selection fields:

```sql
ALTER TABLE payment_sessions
  ADD COLUMN selected_receiving_route_id UUID REFERENCES merchant_receiving_routes(id),
  ADD COLUMN buyer_sender_phone_hmac TEXT,
  ADD COLUMN buyer_sender_phone_masked TEXT;
```

Raw buyer sender phone is not stored.

### `merchant_receiving_routes`

Merchant-side receiving destinations for hosted checkout.

```sql
CREATE TABLE merchant_receiving_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  rail_type TEXT NOT NULL CHECK (rail_type IN ('phone_transfer', 'card_transfer')),
  receiver_identifier_type TEXT NOT NULL CHECK (receiver_identifier_type IN ('phone', 'card')),
  receiver_identifier_encrypted TEXT NOT NULL,
  receiver_identifier_hmac TEXT,
  receiver_identifier_masked TEXT NOT NULL,
  receiver_identifier_last4 TEXT,
  route_code TEXT NOT NULL,
  display_label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  recommended BOOLEAN NOT NULL DEFAULT false,
  review_policy TEXT NOT NULL CHECK (review_policy IN ('review_first', 'eligible_low_risk_later')),
  fees_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (merchant_id, route_code)
);
```

`receiver_identifier_encrypted` is protected storage. Public API, webhook, audit
and log surfaces must use masked route details only.

The merchant-facing API exposes these rows as receiving methods via
`/v1/merchant/receiving-methods`. The public response shape returns only
`id`, `type`, `bank_id`, `label`, `masked_value`, `last4`, `status` and
`is_default`; it never returns `receiver_identifier_encrypted`,
`receiver_identifier_hmac` or the raw card/phone value.

Migration `011_receiving_route_hmac_last4.sql` adds HMAC and last4 fields plus a
partial uniqueness index on `(merchant_id, rail_type, receiver_identifier_hmac)`
for deduplication without raw destination storage.

Migration `013_receiving_route_soft_delete.sql` adds `deleted_at`. Merchant
delete actions soft-delete the route, disable it, remove default status, move
`lifecycle_status` to `deleted`, and hide it from merchant lists and checkout
selection while preserving historical payment session references. The
merchant-facing `DELETE /v1/merchant/receiving-methods/:method_id` response
must include explicit deletion proof (`deleted: true`, matching
`deleted_method_id`, `status: "deleted"` and `lifecycle_status: "deleted"`) so
mobile clients do not treat a weak `2xx` response as a completed deletion.

Checkout selection fields are buyer-flow state only. Receiver-bank selection means the
merchant-side receiving bank chosen for detection and review routing. Payer-bank
launcher selection is buyer UX metadata only and never proves payment, trust, or
official bank confirmation.

### `receiver_devices`

```sql
CREATE TABLE receiver_devices (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  device_name TEXT,
  public_key TEXT NOT NULL,
  app_version TEXT,
  android_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  trust_score INTEGER NOT NULL DEFAULT 0,
  notification_access_status BOOLEAN NOT NULL DEFAULT false,
  last_local_counter BIGINT NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `bank_profiles`

```sql
CREATE TABLE bank_profiles (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'RU',
  status TEXT NOT NULL DEFAULT 'learning',
  reliability_index NUMERIC(5,4) NOT NULL DEFAULT 0,
  unknown_rate_24h NUMERIC(5,4) NOT NULL DEFAULT 0,
  drift_rate_7d NUMERIC(5,4) NOT NULL DEFAULT 0,
  auto_confirm_status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

V1 IDs:

```text
sber_ru
tbank_ru
vtb_ru
alfa_ru
gazprombank_ru
```

### `bank_app_signatures`

```sql
CREATE TABLE bank_app_signatures (
  id UUID PRIMARY KEY,
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  package_name TEXT NOT NULL,
  cert_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  UNIQUE (package_name, cert_sha256)
);
```

### `bank_package_evidence`

```sql
CREATE TABLE bank_package_evidence (
  id UUID PRIMARY KEY,
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
  production_trust_requested_at TIMESTAMPTZ,
  production_trust_requested_by TEXT,
  production_trust_reason TEXT,
  production_trust_approved_at TIMESTAMPTZ,
  production_trust_approved_by TEXT,
  production_trust_approval_reason TEXT,
  production_trust_revoked_at TIMESTAMPTZ,
  production_trust_revoked_by TEXT,
  production_trust_revocation_reason TEXT
);
```

Allowed evidence statuses:

```text
pending_operator_review, approved_for_review_only, rejected, deprecated,
production_trust_requested, production_trust_approved, production_trust_revoked
```

Evidence rows are review workflow material. `approved_for_review_only` does not establish production trust and does not enable auto-confirmation. `production_trust_approved` means only that the package/certificate metadata has passed the explicit human/operator production trust policy; it still does not enable auto-confirmation by itself.

Exact duplicate evidence for the same merchant, receiver device, bank profile, package name, certificate hash and source is idempotent. A changed certificate for the same package creates a new `pending_operator_review` row. `deprecated` is non-destructive and keeps the row available for audit; deprecated evidence cannot request production trust.

`review_reason` should be built from an allowed reason code plus optional redacted notes. Allowed codes are `package_verified_for_review_only`, `cert_matches_operator_expectation`, `package_not_expected`, `cert_changed`, `stale_evidence`, `duplicate_evidence`, `insufficient_evidence`, `synthetic_test_only` and `other`.

### `bank_templates`

```sql
CREATE TABLE bank_templates (
  id UUID PRIMARY KEY,
  bank_profile_id TEXT NOT NULL REFERENCES bank_profiles(id),
  locale TEXT NOT NULL,
  direction_label TEXT NOT NULL,
  canonical_title TEXT NOT NULL,
  canonical_body TEXT NOT NULL,
  template_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new',
  seen_count INTEGER NOT NULL DEFAULT 0,
  human_verified_count INTEGER NOT NULL DEFAULT 0,
  false_positive_count INTEGER NOT NULL DEFAULT 0,
  reliability_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `notification_signals`

```sql
CREATE TABLE notification_signals (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  device_id UUID NOT NULL REFERENCES receiver_devices(id),
  bank_profile_id TEXT REFERENCES bank_profiles(id),
  event_id TEXT NOT NULL,
  notification_hash TEXT NOT NULL,
  semantic_hash TEXT,
  local_counter BIGINT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_minor BIGINT,
  currency TEXT,
  sender_phone_hmac TEXT,
  sender_phone_masked TEXT,
  reference_hmac TEXT,
  reference_code_masked TEXT,
  direction_label TEXT NOT NULL,
  signal_quality INTEGER NOT NULL DEFAULT 0,
  parser_version TEXT NOT NULL,
  template_id UUID REFERENCES bank_templates(id),
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id),
  UNIQUE (notification_hash)
);
```

### `signal_matches`

```sql
CREATE TABLE signal_matches (
  id UUID PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES notification_signals(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  payment_session_id UUID NOT NULL REFERENCES payment_sessions(id),
  score INTEGER NOT NULL,
  decision TEXT NOT NULL,
  collision_detected BOOLEAN NOT NULL DEFAULT false,
  reasons_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `review_queue`

```sql
CREATE TABLE review_queue (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  order_id UUID REFERENCES orders(id),
  payment_session_id UUID REFERENCES payment_sessions(id),
  signal_id UUID REFERENCES notification_signals(id),
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
```

### `review_actions`

```sql
CREATE TABLE review_actions (
  id UUID PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES review_queue(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  actor_id UUID,
  actor_type TEXT,
  actor_source TEXT,
  actor_display TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  feedback_label TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`actor_id` is nullable and stores only a real UUID-backed merchant/admin/user
identity. Runtime labels such as Android Merchant are stored in `actor_type`,
not forced into the UUID column. Supported actor types are
`android_merchant`, `dashboard_merchant`, `system`, `job_worker`,
`receiver_device` and `admin`.

### `webhook_endpoints`

```sql
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  enabled_events JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `webhook_deliveries`

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 7,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  last_http_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replay_of_delivery_id UUID REFERENCES webhook_deliveries(id)
);
```

### `audit_events`

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  merchant_id UUID,
  event_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  payload_redacted JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Auth BFF identity foundation

Sprint 9J adds additive identity/session tables:

- `users`: lightweight merchant account identities. Android account creation must allow pseudonymous users without collecting first or last names.
- `merchant_memberships`: links users to merchants with `owner`, `admin`, `developer`, `operator` and `viewer` roles.
- `admin_roles`: SwimPay internal operator/admin roles, separate from merchant memberships.
- `bff_sessions`: opaque server-side HttpOnly dashboard sessions with active merchant context and CSRF material.

The existing `merchants` table remains the tenant source of truth. Sprint 9J adds `business_name` and `owner_user_id` without dropping the legacy `name` column. BFF human sessions, merchant SDK API keys and Android Receiver device keys are separate identity boundaries.

Android account and onboarding truth is defined in
`docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

Google identity is an optional recovery/linking provider, not the required key
for normal Android account creation. A `google_sub` can be attached to a user
only after login/recovery or security linking.

The Android UX supports personal and business/commerce merchant profiles with
the same app rights. Internally the initial creator can still be represented by
a merchant membership capable of managing the merchant, but the Android product
must not present that as an admin persona.

Known/new-device checks should use privacy-safe device proof such as an app
install keypair and signed challenge. Do not store raw IMEI, raw Android ID,
advertising ID or broad fingerprint material.

## Critical indexes

```sql
CREATE INDEX idx_orders_merchant_status ON orders(merchant_id, status);
CREATE INDEX idx_payment_sessions_active ON payment_sessions(merchant_id, status, valid_until);
CREATE INDEX idx_payment_sessions_checkout_receiver_bank
  ON payment_sessions(merchant_id, selected_receiver_bank_profile_id)
  WHERE selected_receiver_bank_profile_id IS NOT NULL;
CREATE INDEX idx_payment_sessions_checkout_payer_launcher
  ON payment_sessions(merchant_id, selected_payer_bank_launcher_id)
  WHERE selected_payer_bank_launcher_id IS NOT NULL;
CREATE INDEX idx_signals_merchant_observed ON notification_signals(merchant_id, observed_at);
CREATE INDEX idx_signals_amount_currency ON notification_signals(merchant_id, amount_minor, currency);
CREATE INDEX idx_reviews_open ON review_queue(merchant_id, status);
CREATE INDEX idx_review_actions_review_action ON review_actions(review_id, action, created_at DESC);
CREATE UNIQUE INDEX unique_webhook_delivery_endpoint_event
ON webhook_deliveries(endpoint_id, event_id)
WHERE replay_of_delivery_id IS NULL;

CREATE INDEX idx_webhook_due_claim
ON webhook_deliveries(status, next_retry_at, created_at)
WHERE status IN ('pending', 'failed');

CREATE UNIQUE INDEX unique_bank_package_evidence_observation
ON bank_package_evidence(merchant_id, device_id, bank_profile_id, package_name, cert_sha256, source);

CREATE INDEX idx_bank_package_evidence_production_trust
ON bank_package_evidence(status, production_trust_requested_at DESC, production_trust_approved_at DESC)
WHERE status IN ('production_trust_requested', 'production_trust_approved', 'production_trust_revoked');
```

## Critical uniqueness rules

```sql
CREATE UNIQUE INDEX unique_confirmed_order
ON signal_matches(order_id)
WHERE decision = 'manual_confirmed';

CREATE UNIQUE INDEX unique_used_signal_confirmed
ON signal_matches(signal_id)
WHERE decision = 'manual_confirmed';
```

These constraints are mandatory. They prevent double confirmation even if workers race.
