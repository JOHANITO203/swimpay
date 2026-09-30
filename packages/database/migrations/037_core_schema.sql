-- 037 — Le schema « core » : le socle du Cerveau (V1).
--
-- Isole des tables du produit historique. Contraintes gelees par la spec
-- (docs/pivot/07_SPEC_CERVEAU_V1.md) :
--   * pass-through strict — aucun solde client stocke ni affiche ;
--   * montants en entiers XOF (bigint, jamais de flottant) ;
--   * idempotence sur toute operation qui touche un rail ou la DGI ;
--   * horodatage UTC (l'affichage heure d'Abidjan est une affaire de surface) ;
--   * rien ne se supprime : une correction est un nouvel enregistrement.
--
-- Additif et idempotent, comme les migrations qui precedent.

CREATE SCHEMA IF NOT EXISTS core;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Les personnes et leurs moyens d'etre joints
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.party (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('person', 'business')),
  display_name  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Un identifiant appartient a UN SEUL party actif. Le numero n'est pas cherche
-- en clair : on interroge par HMAC (value_hash), la valeur normalisee ne sert
-- qu'a l'affichage et a l'unicite.
CREATE TABLE IF NOT EXISTS core.identifier (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id          uuid NOT NULL REFERENCES core.party(id),
  kind              text NOT NULL CHECK (kind IN ('msisdn', 'rib', 'ncc', 'email', 'djamo')),
  value_normalized  text NOT NULL,
  value_hash        bytea NOT NULL,
  wallet_operator   text,
  verify_tier       text NOT NULL DEFAULT 'declared'
                    CHECK (verify_tier IN ('declared', 'otp', 'document', 'ncc')),
  verified_at       timestamptz,
  proof_ref         text,
  consent_ref       text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Un identifiant ACTIF est unique par nature : deux party ne peuvent pas
-- revendiquer le meme numero en meme temps. Les inactifs restent, c'est
-- l'historique.
CREATE UNIQUE INDEX IF NOT EXISTS identifier_active_unique
  ON core.identifier (kind, value_normalized) WHERE active;
CREATE INDEX IF NOT EXISTS identifier_hash_idx ON core.identifier (kind, value_hash);
CREATE INDEX IF NOT EXISTS identifier_party_idx ON core.identifier (party_id);

-- Chaque changement de palier laisse une trace, avec sa preuve.
CREATE TABLE IF NOT EXISTS core.verification_event (
  id             bigserial PRIMARY KEY,
  identifier_id  uuid NOT NULL REFERENCES core.identifier(id),
  from_tier      text,
  to_tier        text NOT NULL,
  outcome        text NOT NULL CHECK (outcome IN ('success', 'failure')),
  proof_ref      text,
  detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
  at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_event_identifier_idx
  ON core.verification_event (identifier_id, at DESC);

CREATE TABLE IF NOT EXISTS core.business_profile (
  party_id       uuid PRIMARY KEY REFERENCES core.party(id),
  rccm           text,
  ncc            text,
  regime_fiscal  text,
  address        text,
  point_of_sale  text,
  establishment  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Le lien comptable <-> dossiers marchands. Prevu des maintenant : la console
-- est hors code V1, mais c'est le canal d'acquisition, pas un ajout tardif.
CREATE TABLE IF NOT EXISTS core.accountant_link (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_party_id uuid NOT NULL REFERENCES core.party(id),
  merchant_party_id   uuid NOT NULL REFERENCES core.party(id),
  scope               text NOT NULL DEFAULT 'read' CHECK (scope IN ('read')),
  status              text NOT NULL DEFAULT 'invited'
                      CHECK (status IN ('invited', 'accepted', 'revoked')),
  invited_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz,
  revoked_at          timestamptz,
  UNIQUE (accountant_party_id, merchant_party_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Le carnet du marchand
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.client (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_party_id  uuid NOT NULL REFERENCES core.party(id),
  party_id           uuid REFERENCES core.party(id),
  display_name       text NOT NULL,
  ncc                text,
  phone              text,
  email              text,
  exoneration        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_merchant_idx ON core.client (merchant_party_id);

CREATE TABLE IF NOT EXISTS core.product (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_party_id  uuid NOT NULL REFERENCES core.party(id),
  name               text NOT NULL,
  unit_price_minor   bigint NOT NULL CHECK (unit_price_minor >= 0),
  tva_rate           text NOT NULL DEFAULT 'TVA'
                     CHECK (tva_rate IN ('TVA', 'TVAB', 'TVAC', 'TVAD')),
  unit               text,
  reference          text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_merchant_idx ON core.product (merchant_party_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Les ventes et les paiements
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.sale (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_party_id  uuid NOT NULL REFERENCES core.party(id),
  amount_minor       bigint NOT NULL CHECK (amount_minor > 0),
  channel            text NOT NULL CHECK (channel IN
                     ('qr_static', 'qr_dyn', 'link', 'manual_cash', 'manual_other', 'api')),
  reference          text,
  description        text,
  lines              jsonb,
  client_id          uuid REFERENCES core.client(id),
  occurred_at        timestamptz NOT NULL DEFAULT now(),
  status             text NOT NULL DEFAULT 'pending_payment'
                     CHECK (status IN ('pending_payment', 'matched', 'invoiced', 'void')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
-- La reference portee par un QR dynamique ou un lien doit etre unique CHEZ LE
-- MARCHAND : c'est elle qui fait le rapprochement automatique a 100.
CREATE UNIQUE INDEX IF NOT EXISTS sale_merchant_reference_unique
  ON core.sale (merchant_party_id, reference) WHERE reference IS NOT NULL;
-- L'index du rapprocheur : candidats du meme marchand, en attente, par date.
CREATE INDEX IF NOT EXISTS sale_candidates_idx
  ON core.sale (merchant_party_id, status, occurred_at DESC);

CREATE TABLE IF NOT EXISTS core.payment_intent (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id           uuid REFERENCES core.sale(id),
  merchant_party_id uuid NOT NULL REFERENCES core.party(id),
  rail              text NOT NULL,
  direction         text NOT NULL DEFAULT 'payin' CHECK (direction IN ('payin', 'payout')),
  rail_ref          text,
  amount_minor      bigint NOT NULL CHECK (amount_minor > 0),
  payer_msisdn_hash bytea,
  reference         text,
  status            text NOT NULL DEFAULT 'initiated'
                    CHECK (status IN ('initiated', 'pending', 'succeeded', 'failed', 'expired')),
  idempotency_key   text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- L'idempotence n'est pas un confort : c'est ce qui empeche un double payout.
CREATE UNIQUE INDEX IF NOT EXISTS payment_intent_idempotency_unique
  ON core.payment_intent (idempotency_key);
CREATE INDEX IF NOT EXISTS payment_intent_rail_ref_idx ON core.payment_intent (rail, rail_ref);
CREATE INDEX IF NOT EXISTS payment_intent_open_idx
  ON core.payment_intent (status, updated_at) WHERE status IN ('initiated', 'pending');

-- Chaque payload fournisseur, BRUT, avant tout traitement. C'est ce qui permet
-- de rejouer l'etat complet et de prouver ce qu'on a recu.
CREATE TABLE IF NOT EXISTS core.external_event (
  id           bigserial PRIMARY KEY,
  source       text NOT NULL CHECK (source IN ('paydunya', 'dgi', 'whatsapp', 'sim')),
  kind         text NOT NULL,
  raw          jsonb NOT NULL,
  sig_valid    boolean,
  dedupe_key   text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error        text
);
CREATE UNIQUE INDEX IF NOT EXISTS external_event_dedupe_unique
  ON core.external_event (source, dedupe_key);
CREATE INDEX IF NOT EXISTS external_event_unprocessed_idx
  ON core.external_event (received_at) WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS core.match (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id           uuid NOT NULL REFERENCES core.sale(id),
  payment_intent_id uuid REFERENCES core.payment_intent(id),
  score             integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  method            text NOT NULL CHECK (method IN ('auto_ref', 'auto_heur', 'manual', 'cash')),
  decided_by        text,
  decided_at        timestamptz NOT NULL DEFAULT now()
);
-- Une vente est rapprochee une fois ; un paiement ne sert qu'une fois.
CREATE UNIQUE INDEX IF NOT EXISTS match_sale_unique ON core.match (sale_id);
CREATE UNIQUE INDEX IF NOT EXISTS match_intent_unique
  ON core.match (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

-- Les candidats proposes et la decision humaine : la matiere d'apprentissage
-- des poids v2. On l'enregistre des J1, meme si personne ne s'en sert encore.
CREATE TABLE IF NOT EXISTS core.match_feedback (
  id                bigserial PRIMARY KEY,
  payment_intent_id uuid REFERENCES core.payment_intent(id),
  candidates        jsonb NOT NULL,
  chosen_sale_id    uuid REFERENCES core.sale(id),
  decided_by        text,
  at                timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Les factures
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.invoice (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id            uuid REFERENCES core.sale(id),
  merchant_party_id  uuid NOT NULL REFERENCES core.party(id),
  client_party_id    uuid REFERENCES core.party(id),
  client_snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
  invoice_type       text NOT NULL DEFAULT 'sale' CHECK (invoice_type IN ('sale', 'purchase')),
  template           text NOT NULL DEFAULT 'B2C' CHECK (template IN ('B2B', 'B2C', 'B2G', 'B2F')),
  payment_method     text NOT NULL CHECK (payment_method IN
                     ('cash', 'card', 'check', 'mobile-money', 'transfer', 'deferred')),
  lines              jsonb NOT NULL,
  total_ht           bigint NOT NULL CHECK (total_ht >= 0),
  total_tva          bigint NOT NULL CHECK (total_tva >= 0),
  total_ttc          bigint NOT NULL CHECK (total_ttc >= 0),
  number_local       text NOT NULL,
  fne_status         text NOT NULL DEFAULT 'draft'
                     CHECK (fne_status IN ('draft', 'queued', 'submitted', 'accepted', 'rejected')),
  fne_ref            text,
  fne_token          text,
  fne_proof_ref      text,
  balance_sticker    integer,
  refund_of_id       uuid REFERENCES core.invoice(id),
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
-- La numerotation locale est continue PAR MARCHAND : un trou se voit.
CREATE UNIQUE INDEX IF NOT EXISTS invoice_number_local_unique
  ON core.invoice (merchant_party_id, number_local);
CREATE INDEX IF NOT EXISTS invoice_fne_status_idx
  ON core.invoice (merchant_party_id, fne_status, created_at DESC);
-- Une facture certifiee porte une reference DGI, et une seule : c'est la
-- reference qui est unique, pas la ligne. Chaque certification consomme un
-- sticker prepaye et l'API DGI n'offre ni idempotence ni endpoint de statut.
CREATE UNIQUE INDEX IF NOT EXISTS invoice_fne_ref_unique
  ON core.invoice (fne_ref) WHERE fne_ref IS NOT NULL;

-- Le stock de stickers, par marchand. La reponse DGI le donne a chaque
-- certification : on le suit pour alerter AVANT la rupture.
CREATE TABLE IF NOT EXISTS core.sticker_balance (
  merchant_party_id uuid PRIMARY KEY REFERENCES core.party(id),
  balance           integer NOT NULL,
  warning           boolean NOT NULL DEFAULT false,
  observed_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Ce qui ne se tranche pas tout seul, et ce qui se raconte
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.exception_queue (
  id                 bigserial PRIMARY KEY,
  merchant_party_id  uuid REFERENCES core.party(id),
  kind               text NOT NULL CHECK (kind IN
                     ('unmatched_payment', 'ambiguous_match', 'amount_mismatch',
                      'invoice_rejected', 'payout_failed', 'identity_conflict',
                      'import_error', 'dgi_uncertain')),
  payload            jsonb NOT NULL,
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolution         text,
  resolved_by        text,
  resolved_at        timestamptz,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exception_open_idx
  ON core.exception_queue (merchant_party_id, kind, created_at DESC) WHERE status = 'open';

-- Journal immuable. Aucune mise a jour, aucune suppression : voir le trigger.
CREATE TABLE IF NOT EXISTS core.audit_event (
  id           bigserial PRIMARY KEY,
  actor        text NOT NULL,
  action       text NOT NULL,
  entity_ref   text NOT NULL,
  reason_code  text,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON core.audit_event (entity_ref, at DESC);

CREATE OR REPLACE FUNCTION core.refuse_mutation() RETURNS trigger AS $refuse$
BEGIN
  RAISE EXCEPTION 'core.% est append-only (tentative de %)', TG_TABLE_NAME, TG_OP;
END;
$refuse$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_event_append_only ON core.audit_event;
CREATE TRIGGER audit_event_append_only
  BEFORE UPDATE OR DELETE ON core.audit_event
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

DROP TRIGGER IF EXISTS external_event_no_delete ON core.external_event;
CREATE TRIGGER external_event_no_delete
  BEFORE DELETE ON core.external_event
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

DROP TRIGGER IF EXISTS verification_event_append_only ON core.verification_event;
CREATE TRIGGER verification_event_append_only
  BEFORE UPDATE OR DELETE ON core.verification_event
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Le routeur, ce qu'il observe, et les plafonds qui dorment
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.rail_policy (
  id                bigserial PRIMARY KEY,
  operation         text NOT NULL CHECK (operation IN ('payin', 'payout')),
  currency          text NOT NULL DEFAULT 'XOF',
  rail              text NOT NULL,
  operator          text NOT NULL DEFAULT '*',
  enabled           boolean NOT NULL DEFAULT true,
  -- Aucun payout ne part sans grille de cout : la lecon « paie sous le cout ».
  cost_fixed_minor  bigint,
  cost_percent_bp   integer,
  priority          integer NOT NULL DEFAULT 100,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operation, currency, rail, operator)
);

CREATE TABLE IF NOT EXISTS core.rail_stats (
  rail           text NOT NULL,
  hour           timestamptz NOT NULL,
  op             text NOT NULL CHECK (op IN ('payin', 'payout')),
  success_count  integer NOT NULL DEFAULT 0,
  fail_count     integer NOT NULL DEFAULT 0,
  latency_ms_p50 integer,
  latency_ms_p95 integer,
  PRIMARY KEY (rail, hour, op)
);

-- Plafonds reglementaires DORMANTS : codes, non appliques en pass-through.
CREATE TABLE IF NOT EXISTS core.limits (
  code         text PRIMARY KEY,
  amount_minor bigint NOT NULL,
  period       text,
  enforced     boolean NOT NULL DEFAULT false,
  note         text
);
INSERT INTO core.limits (code, amount_minor, period, enforced, note) VALUES
  ('wallet_balance_max', 2000000, NULL, false, 'plafond d encours, dormant'),
  ('monthly_volume_max', 10000000, 'month', false, 'plafond mensuel, dormant'),
  ('single_op_max',        200000, NULL, false, 'plafond par operation, dormant')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. La sortie : notifications et jobs (pattern outbox, pas de NATS en V1)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.outbox (
  id            bigserial PRIMARY KEY,
  topic         text NOT NULL,
  payload       jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'failed')),
  attempts      integer NOT NULL DEFAULT 0,
  last_error    text,
  available_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_due_idx
  ON core.outbox (available_at) WHERE status = 'pending';
