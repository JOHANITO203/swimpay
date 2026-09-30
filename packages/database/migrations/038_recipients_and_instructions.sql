-- 038 — Le carnet, la file d'installation, et l'instruction.
--
-- Les deux outils que LO a poses : le workflow qu'on impose, et le
-- determinisme qui en decoule.
--
--   * on ne devine pas ou joindre quelqu'un, on le fait DECLARER une fois.
--     C'est le carnet (core.recipient) ;
--   * ce qui est declare ne se redemande plus, et une installation supprime
--     meme la question. C'est la file (core.invitation) ;
--   * l'operation est connue AVANT que l'argent bouge, avec ses contraintes.
--     C'est l'instruction (core.instruction) — et tout ce qui passe par la
--     n'aura jamais besoin d'etre rapproche a l'aveugle.
--
-- Additif et idempotent.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Le carnet de destinataires
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.recipient (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- A qui appartient ce carnet : un particulier ou une entreprise.
  owner_party_id     uuid NOT NULL REFERENCES core.party(id),
  -- Le destinataire lui-meme, quand on a pu l'identifier dans l'Annuaire.
  party_id           uuid REFERENCES core.party(id),
  display_name       text NOT NULL,
  -- Le parcours est un CLIQUET : ad_hoc -> saved -> invited -> active, et un
  -- actif ne redescend jamais.
  stage              text NOT NULL DEFAULT 'ad_hoc'
                     CHECK (stage IN ('ad_hoc', 'saved', 'invited', 'active')),
  -- Ce que l'utilisateur a DECLARE : c'est cela qu'on ne redemandera plus.
  destination_value  text,
  destination_hash   bytea,
  preferred_rail     text,
  preferred_operator text,
  verify_tier        text CHECK (verify_tier IN ('declared', 'otp', 'document', 'ncc')),
  -- Ce qu'on apprend a l'usage : la frequence fait les « contacts frequents ».
  successful_transfers integer NOT NULL DEFAULT 0,
  last_used_at       timestamptz,
  invited_at         timestamptz,
  activated_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Un meme destinataire n'apparait qu'une fois dans un carnet donne : sinon
-- l'utilisateur choisit entre deux lignes identiques, et le determinisme
-- qu'on cherchait se perd.
CREATE UNIQUE INDEX IF NOT EXISTS recipient_owner_destination_unique
  ON core.recipient (owner_party_id, destination_hash)
  WHERE destination_hash IS NOT NULL;
-- L'index des « contacts frequents » : les plus utilises, les plus recents.
CREATE INDEX IF NOT EXISTS recipient_frequent_idx
  ON core.recipient (owner_party_id, successful_transfers DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS recipient_stage_idx ON core.recipient (owner_party_id, stage);

-- Le cliquet, tenu par la base et non par la bonne volonte de l'appelant.
CREATE OR REPLACE FUNCTION core.recipient_stage_is_a_ratchet() RETURNS trigger AS $ratchet$
DECLARE
  rangs constant jsonb := '{"ad_hoc":0,"saved":1,"invited":2,"active":3}'::jsonb;
BEGIN
  IF (rangs ->> NEW.stage)::int < (rangs ->> OLD.stage)::int THEN
    RAISE EXCEPTION 'core.recipient : le parcours ne redescend pas (% vers %)',
      OLD.stage, NEW.stage;
  END IF;
  RETURN NEW;
END;
$ratchet$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipient_stage_ratchet ON core.recipient;
CREATE TRIGGER recipient_stage_ratchet
  BEFORE UPDATE OF stage ON core.recipient
  FOR EACH ROW EXECUTE FUNCTION core.recipient_stage_is_a_ratchet();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. La file d'installation
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.invitation (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id     uuid NOT NULL REFERENCES core.recipient(id),
  inviter_party_id uuid NOT NULL REFERENCES core.party(id),
  -- Le lien porte un jeton a usage unique ; on n'en garde que l'empreinte.
  token_hash       bytea NOT NULL,
  channel          text NOT NULL DEFAULT 'sms'
                   CHECK (channel IN ('sms', 'whatsapp', 'link', 'email')),
  status           text NOT NULL DEFAULT 'sent'
                   CHECK (status IN ('sent', 'opened', 'installed', 'expired', 'revoked')),
  sent_at          timestamptz NOT NULL DEFAULT now(),
  opened_at        timestamptz,
  installed_at     timestamptz,
  expires_at       timestamptz,
  -- Ce que cette installation aura fait economiser, une fois constatee.
  saved_cost_minor bigint
);
CREATE UNIQUE INDEX IF NOT EXISTS invitation_token_unique ON core.invitation (token_hash);
CREATE INDEX IF NOT EXISTS invitation_open_idx
  ON core.invitation (inviter_party_id, status) WHERE status IN ('sent', 'opened');

-- ─────────────────────────────────────────────────────────────────────────
-- 3. L'instruction : l'operation declaree avant d'etre executee
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.instruction (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               text NOT NULL CHECK (kind IN ('transfer', 'payout', 'topup')),
  origin_party_id    uuid NOT NULL REFERENCES core.party(id),
  origin_account_id  text NOT NULL,
  recipient_id       uuid NOT NULL REFERENCES core.recipient(id),
  -- Vrai : compte a compte, sans rail, sans frais. Faux : le rail ci-dessous.
  direct             boolean NOT NULL,
  rail               text,
  operator           text,
  destination_value  text,
  amount_minor       bigint NOT NULL CHECK (amount_minor > 0),
  -- Ce que l'utilisateur a VU avant de confirmer. Sans cela, un ecart de frais
  -- devient un litige ou personne ne peut prouver ce qui avait ete annonce.
  quoted_fee_minor   bigint,
  quoted_delay       text,
  quoted_at          timestamptz,
  status             text NOT NULL DEFAULT 'sealed'
                     CHECK (status IN ('sealed', 'executing', 'executed', 'refused', 'failed')),
  refusal_code       text,
  payment_intent_id  uuid REFERENCES core.payment_intent(id),
  -- Derivee du contenu : deux fois le meme geste ne font qu'une operation.
  idempotency_key    text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS instruction_idempotency_unique
  ON core.instruction (idempotency_key);
CREATE INDEX IF NOT EXISTS instruction_open_idx
  ON core.instruction (origin_party_id, status, created_at DESC);

-- Une instruction ne part pas sans que son devis ait ete montre. La regle est
-- ici, pas seulement dans le code de l'ecran : c'est la base qui la tient.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instruction_quote_shown_ck') THEN
    ALTER TABLE core.instruction
      ADD CONSTRAINT instruction_quote_shown_ck
      CHECK (status = 'sealed' OR quoted_at IS NOT NULL);
  END IF;
END
$$;

-- Un envoi direct n'a ni rail ni destination ; un envoi par rail a les deux.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instruction_direct_shape_ck') THEN
    ALTER TABLE core.instruction
      ADD CONSTRAINT instruction_direct_shape_ck
      CHECK (
        (direct AND rail IS NULL AND destination_value IS NULL)
        OR (NOT direct AND rail IS NOT NULL AND destination_value IS NOT NULL)
      );
  END IF;
END
$$;
