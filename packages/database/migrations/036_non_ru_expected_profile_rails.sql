-- 036 — Extend the expected-payment profile to non-RU rails so mobile money (XOF) and wallet
-- (USD) sessions can carry a matching profile, alongside the existing RU card/sbp. The RU
-- rails are unchanged. Additive + idempotent.
--
-- Rail identity keys (mirrors deriveExpectedPaymentProfile in @swimpay/contracts):
--   card         -> sender_card_* (Luhn PAN), no phone
--   sbp          -> sender_phone_* (Russian phone), no card
--   mobile_money -> sender_phone_* (West-Africa phone), no card  [phone is the strong key]
--   wallet       -> neither card nor phone  [reference + buyer-name based; neobanks notify the
--                   sender NAME, not email/@tag — the sender wallet-identity key arrives with
--                   the receiver enhancement]

-- 1) Widen the payment_method domain (was the card/sbp-only inline check from migration 014).
ALTER TABLE payment_sessions DROP CONSTRAINT IF EXISTS payment_sessions_payment_method_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_payment_method_domain_ck') THEN
    ALTER TABLE payment_sessions
      ADD CONSTRAINT payment_sessions_payment_method_domain_ck
      CHECK (payment_method IS NULL OR payment_method IN ('card', 'sbp', 'mobile_money', 'wallet'));
  END IF;
END $$;

-- 2) Rail-specific sender-identity constraints (replace the card/sbp-only method check).
ALTER TABLE payment_sessions DROP CONSTRAINT IF EXISTS payment_sessions_expected_profile_method_ck;
ALTER TABLE payment_sessions
  ADD CONSTRAINT payment_sessions_expected_profile_method_ck
  CHECK (
    payment_method IS NULL
    OR (
      payment_method = 'card'
      AND sender_card_hmac IS NOT NULL AND sender_card_last4 IS NOT NULL AND sender_card_masked IS NOT NULL
      AND sender_phone_hmac IS NULL AND sender_phone_masked IS NULL
    )
    OR (
      payment_method = 'sbp'
      AND sender_phone_hmac IS NOT NULL AND sender_phone_masked IS NOT NULL
      AND sender_card_hmac IS NULL AND sender_card_last4 IS NULL AND sender_card_masked IS NULL
    )
    OR (
      payment_method = 'mobile_money'
      AND sender_phone_hmac IS NOT NULL AND sender_phone_masked IS NOT NULL
      AND sender_card_hmac IS NULL AND sender_card_last4 IS NULL AND sender_card_masked IS NULL
    )
    OR (
      payment_method = 'wallet'
      AND sender_card_hmac IS NULL AND sender_card_last4 IS NULL AND sender_card_masked IS NULL
      AND sender_phone_hmac IS NULL AND sender_phone_masked IS NULL
    )
  );
