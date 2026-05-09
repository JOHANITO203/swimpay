# Buyer Checkout 4-Step Deployment Report

generated_at: 2026-05-09T16:03:12+03:00

## Scope

This report closes the implementation batch that aligns the hosted buyer checkout with the four-step V1 flow:

1. buyer identity and sender method;
2. Expected Payment Profile;
3. exact payment instructions;
4. open bank / arm receiver;
5. buyer paid claim and waiting state;
6. SwimPay Intelligence fallback context.

It also includes the adjacent SDK/developer integration documentation and helper UI changes currently present in the same implementation batch.

## Product Boundaries Preserved

- No real bank notification was processed.
- No auto-confirmation was enabled.
- `payment.confirmed` semantics were not changed.
- Public webhooks remain final-only: `payment.confirmed`, `payment.rejected`, `payment.expired`.
- `J'ai paye` remains a buyer claim only.
- `Ouvrir ma banque` arms the receiver only.
- No CVV, expiry date, PIN, SMS code, API key or webhook secret is accepted in buyer/browser/Android runtime paths.
- PAN and buyer phone values are derived into masked/HMAC forms and are not returned raw after submit.

## Migration To Apply On VPS

Preferred command after the repo has been pulled/synced on the VPS:

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code
sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < packages/database/migrations/014_expected_payment_profile.sql
```

If the file does not exist yet on the VPS, create it manually:

```bash
cat > /tmp/014_expected_payment_profile.sql <<'SQL'
ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('card', 'sbp')),
  ADD COLUMN IF NOT EXISTS sender_bank_id TEXT,
  ADD COLUMN IF NOT EXISTS sender_card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS sender_card_masked TEXT,
  ADD COLUMN IF NOT EXISTS sender_card_hmac TEXT,
  ADD COLUMN IF NOT EXISTS sender_phone_masked TEXT,
  ADD COLUMN IF NOT EXISTS sender_phone_hmac TEXT,
  ADD COLUMN IF NOT EXISTS buyer_first_name_raw TEXT,
  ADD COLUMN IF NOT EXISTS buyer_last_name_raw TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_script_detected TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_latin_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_cyrillic_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_initial_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_reversed_order_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_name_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS display_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS payable_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS reconciliation_delta_minor BIGINT,
  ADD COLUMN IF NOT EXISTS expected_payment_fingerprint TEXT;

UPDATE payment_sessions
SET display_amount_minor = COALESCE(display_amount_minor, expected_amount_minor),
    payable_amount_minor = COALESCE(payable_amount_minor, expected_amount_minor),
    reconciliation_delta_minor = COALESCE(reconciliation_delta_minor, 0)
WHERE display_amount_minor IS NULL
   OR payable_amount_minor IS NULL
   OR reconciliation_delta_minor IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_expected_profile_amounts_ck'
  ) THEN
    ALTER TABLE payment_sessions
      ADD CONSTRAINT payment_sessions_expected_profile_amounts_ck
      CHECK (
        (display_amount_minor IS NULL OR display_amount_minor > 0)
        AND (payable_amount_minor IS NULL OR payable_amount_minor > 0)
        AND (reconciliation_delta_minor IS NULL OR reconciliation_delta_minor BETWEEN 0 AND 99)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_expected_profile_method_ck'
  ) THEN
    ALTER TABLE payment_sessions
      ADD CONSTRAINT payment_sessions_expected_profile_method_ck
      CHECK (
        payment_method IS NULL
        OR (
          payment_method = 'card'
          AND sender_card_hmac IS NOT NULL
          AND sender_card_last4 IS NOT NULL
          AND sender_card_masked IS NOT NULL
          AND sender_phone_hmac IS NULL
          AND sender_phone_masked IS NULL
        )
        OR (
          payment_method = 'sbp'
          AND sender_phone_hmac IS NOT NULL
          AND sender_phone_masked IS NOT NULL
          AND sender_card_hmac IS NULL
          AND sender_card_last4 IS NULL
          AND sender_card_masked IS NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_sessions_expected_profile
  ON payment_sessions(merchant_id, payment_method, sender_bank_id, status, valid_until);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_sessions_expected_fingerprint
  ON payment_sessions(merchant_id, expected_payment_fingerprint)
  WHERE expected_payment_fingerprint IS NOT NULL;
SQL

sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /tmp/014_expected_payment_profile.sql
```

Verification query:

```bash
sudo docker exec -i swimpay-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '\''payment_sessions'\'' AND column_name = '\''expected_payment_fingerprint'\'') AS has_expected_profile,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '\''idx_payment_sessions_expected_profile'\'') AS has_profile_index,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '\''idx_payment_sessions_expected_fingerprint'\'') AS has_fingerprint_index;
"'
```

## Logical Next Step

After push and Dokploy redeploy:

1. apply migration `014_expected_payment_profile.sql`;
2. verify `https://staging.swimpay.pro/api-health`;
3. create a staging order through the SDK;
4. open hosted `checkout_url` without Authorization;
5. test Step 1 with card, then SBP/phone;
6. verify Step 2 selects only the matching active receiving route;
7. click `Ouvrir ma banque`, then `J'ai paye`;
8. confirm no webhook fires until merchant manual confirmation;
9. then run the final-only webhook rehearsal.

Real bank notification capture must stay closed until this synthetic SDK/checkout/manual-review/webhook rehearsal passes.
