-- 039 — L'operation, de l'atome au lot.
--
-- Ce que LO a demande, ramene a son etat initial : « c'est un virement
-- d'argent ou un transfert vers un mobile money ou une banque ». Une seule
-- primitive donc, et une seule : le BRIN (core.movement).
--
--   Un brin est le deplacement d'un montant entier XOF, depuis EXACTEMENT un
--   porteur d'origine vers EXACTEMENT un porteur de destination, sous une cle
--   d'idempotence DERIVEE PAR LA BASE de son contenu.
--
-- Trois natures de porteur, et rien d'autre :
--   * enveloppe — une position SwimPay (core.envelope) ;
--   * interne   — frais, suspens, reserve (core.internal_account) ;
--   * rail      — un compte joint dehors par un adaptateur (decrit en ligne).
--
-- Comme un brin porte une origine et une destination, la conservation
-- (somme des debits == somme des credits) est vraie PAR CONSTRUCTION, ligne a
-- ligne. Il n'y a rien a additionner pour s'en assurer, donc rien a oublier.
--
-- Trois etages, un seul par question :
--   core.movement  — le fait comptable. Machine a etats COURTE.
--   core.operation — ce que l'utilisateur voit et confirme. Machine LONGUE.
--   core.batch     — le lot : N operations en un clic, avec ce qui est garanti
--                    et ce qui ne l'est pas, ecrit noir sur blanc.
--
-- Ce que cette migration corrige de l'existant :
--   * la cle d'idempotence n'est plus fournie par l'appelant. Elle est une
--     colonne GENERATED : le sessionNonce de instruction.ts:196 devient
--     structurellement impossible a injecter ;
--   * l'etat « unknown » existe, et il ne se rejoue pas ;
--   * un virement interne a enfin une table ou ecrire le credit du
--     destinataire ;
--   * le devis est en DEUX parts (rail / service), et le frais reellement
--     preleve est stocke face au frais annonce ;
--   * un lot a une identite, un instantane gele, des approbations, une
--     reserve, et un etat « 28 sur 30 ».
--
-- La question NON TRANCHEE (07_SPEC dit « aucun solde client », 00_VISION et
-- 06_PROJET disent « les enveloppes ») n'est pas devinee ici : elle est un
-- INTERRUPTEUR (core.money_model). Tant qu'elle n'est pas tranchee, la base
-- refuse les enveloppes et n'accepte que les operations sans sejour. Le
-- basculement est un UPDATE, pas une reecriture.
--
-- Additif et idempotent, comme 037 et 038. Postgres 13+ (gen_random_uuid,
-- sha256, colonnes generees).

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Outils : la derivation de cle, et l'ouverture des enumerations trop
--    tot fermees en 037.
-- ─────────────────────────────────────────────────────────────────────────

-- La cle d'idempotence est calculee PAR LA BASE. L'appelant ne peut pas la
-- choisir, donc il ne peut pas y glisser un nonce de session. C'est le seul
-- defaut de l'existant qui, tel quel, produit un double versement.
CREATE OR REPLACE FUNCTION core.cle(contenu text) RETURNS text AS $cle$
  SELECT encode(sha256(convert_to(contenu, 'UTF8')), 'hex');
$cle$ LANGUAGE sql IMMUTABLE STRICT;

-- 037 fermait la liste des sources d'evenement a quatre valeurs. Un rail de
-- plus (CinetPay, une banque, un partenaire) exigeait une migration : c'est
-- une porte fermee trop tot. On la remplace par un registre, qui s'alimente
-- par INSERT.
CREATE TABLE IF NOT EXISTS core.event_source (
  code   text PRIMARY KEY,
  label  text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO core.event_source (code, label) VALUES
  ('paydunya', 'PayDunya'),
  ('dgi',      'DGI / FNE'),
  ('whatsapp', 'WhatsApp Business'),
  ('sim',      'Rail simule')
ON CONFLICT (code) DO NOTHING;

DO $ouvre$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_event_source_check') THEN
    ALTER TABLE core.external_event DROP CONSTRAINT external_event_source_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_event_source_fk') THEN
    ALTER TABLE core.external_event
      ADD CONSTRAINT external_event_source_fk
      FOREIGN KEY (source) REFERENCES core.event_source(code);
  END IF;
END
$ouvre$;

-- Les nouveaux motifs de file d'exception que l'argent reclame. 037 avait
-- ferme la liste sur huit valeurs, aucune ne nommait l'incertitude d'un
-- versement ni le soupcon de doublon.
DO $exc$
BEGIN
  -- Deux noms ont existe : celui que Postgres a genere pour la contrainte
  -- inline de 037, et celui pose ensuite. On retire les DEUX avant de
  -- reposer la liste COMPLETE. Sans cela, la derniere migration appliquee
  -- efface les motifs ajoutes par l'autre — ce qui est arrive.
  ALTER TABLE core.exception_queue DROP CONSTRAINT IF EXISTS exception_queue_kind_check;
  ALTER TABLE core.exception_queue DROP CONSTRAINT IF EXISTS exception_queue_kind_ck;
  ALTER TABLE core.exception_queue
    ADD CONSTRAINT exception_queue_kind_ck CHECK (kind IN (
      'unmatched_payment',
      'ambiguous_match',
      'amount_mismatch',
      'invoice_rejected',
      'payout_failed',
      'identity_conflict',
      'import_error',
      'dgi_uncertain',
      'movement_unknown',
      'duplicate_suspected',
      'fee_mismatch',
      'batch_partial',
      'funding_insufficient',
      'reserve_residual'
    ));
END
$exc$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. L'interrupteur non tranche : y a-t-il une position par client ?
-- ─────────────────────────────────────────────────────────────────────────
--
-- 07_SPEC_CERVEAU_V1 §7 : « pas de solde stocke ni affiche ».
-- 00_VISION §2 et 06_PROJET : « SwimPay tient les enveloppes ».
-- Le prototype affiche un solde sur cinq ecrans.
-- Les trois ne peuvent pas etre vrais. On ne devine pas : on parametre, et la
-- base refuse ce qui n'a pas ete decide.

CREATE TABLE IF NOT EXISTS core.money_model (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  mode        text NOT NULL DEFAULT 'undecided'
              CHECK (mode IN ('undecided', 'pass_through', 'custody')),
  decided_by  text,
  decided_at  timestamptz,
  note        text NOT NULL DEFAULT
              'Arbitrage LO en attente : 07_SPEC dit non, 00_VISION/06_PROJET et le prototype disent oui.'
);
INSERT INTO core.money_model (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION core.mode_argent() RETURNS text AS $mode$
  SELECT mode FROM core.money_model WHERE id;
$mode$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les porteurs
-- ─────────────────────────────────────────────────────────────────────────

-- Les comptes internes : ce qui n'appartient a aucun client mais doit
-- exister pour que rien ne disparaisse. Le suspens est le coeur du dispositif :
-- entre le moment ou l'argent quitte une enveloppe et celui ou le rail
-- confirme, il est LA, et nulle part ailleurs.
CREATE TABLE IF NOT EXISTS core.internal_account (
  code           text PRIMARY KEY,
  label          text NOT NULL,
  currency       text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  balance_minor  bigint NOT NULL DEFAULT 0,
  allow_negative boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internal_account_sign_ck CHECK (allow_negative OR balance_minor >= 0)
);
INSERT INTO core.internal_account (code, label, allow_negative) VALUES
  ('SUSPENSE_IN_TRANSIT', 'Argent parti d une position, pas encore arrive dehors', false),
  ('FEE_REVENUE',         'Frais de service percus par SwimPay',                   false),
  ('RAIL_COST',           'Frais reellement preleves par les rails',               true),
  ('ROUNDING',            'Ecarts d arrondi constates',                            true)
ON CONFLICT (code) DO NOTHING;

-- Le lot est declare avant l'enveloppe : la reserve d'un lot EST une
-- enveloppe, et c'est ce qui rend impossible de payer plus que provisionne.
CREATE TABLE IF NOT EXISTS core.batch (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_party_id    uuid NOT NULL REFERENCES core.party(id),
  kind              text NOT NULL CHECK (kind IN ('payroll', 'mass_payout', 'refund_run')),
  label             text NOT NULL,
  currency          text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),

  -- Ce que le lot garantit, ecrit dans la ligne elle-meme.
  --   reserve  : phase 1 atomique — un debit unique vers une reserve gelee.
  --              Impossible de payer plus que provisionne.
  --   per_line : pas de reserve (mode pass_through). Aucune garantie de
  --              financement global : on l'ecrit au lieu de le promettre.
  funding_mode      text NOT NULL DEFAULT 'reserve'
                    CHECK (funding_mode IN ('reserve', 'per_line')),

  line_count        integer NOT NULL DEFAULT 0 CHECK (line_count >= 0),
  total_amount_minor bigint NOT NULL DEFAULT 0 CHECK (total_amount_minor >= 0),
  total_fee_minor   bigint NOT NULL DEFAULT 0 CHECK (total_fee_minor >= 0),

  -- L'instantane. Il est calcule au scellement et ne bouge plus : ce qui a
  -- ete approuve et ce qui part ne peuvent plus diverger.
  snapshot_hash     text,
  approvals_required integer NOT NULL DEFAULT 1 CHECK (approvals_required >= 1),

  scheduled_at      timestamptz,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN (
                      'draft', 'sealed', 'approved', 'funded', 'executing',
                      'settled', 'partially_settled', 'closed', 'cancelled')),
  sealed_at         timestamptz,
  funded_at         timestamptz,
  closed_at         timestamptz,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS batch_owner_idx ON core.batch (owner_party_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS batch_due_idx ON core.batch (scheduled_at)
  WHERE status IN ('approved', 'funded') AND scheduled_at IS NOT NULL;

-- La position. N'existe qu'en mode custody ; le trigger de la section 6 le
-- fait respecter. En mode pass_through la table reste vide, et tout le reste
-- du modele fonctionne sans elle.
CREATE TABLE IF NOT EXISTS core.envelope (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id      uuid REFERENCES core.party(id),
  batch_id      uuid REFERENCES core.batch(id),
  purpose       text NOT NULL CHECK (purpose IN
                ('user', 'business_treasury', 'vault', 'batch_reserve')),
  currency      text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  -- Le solde n'est JAMAIS ecrit par l'application : voir core.envelope_balance_is_derived.
  balance_minor bigint NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'frozen', 'closed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Une enveloppe appartient soit a une personne, soit a un lot. Jamais aux deux.
  CONSTRAINT envelope_owner_ck CHECK (
    (purpose = 'batch_reserve' AND batch_id IS NOT NULL AND party_id IS NULL)
    OR (purpose <> 'batch_reserve' AND party_id IS NOT NULL AND batch_id IS NULL)
  )
);
-- Une seule position par nature et par partie : sinon « le solde » n'a pas de sens.
CREATE UNIQUE INDEX IF NOT EXISTS envelope_party_purpose_unique
  ON core.envelope (party_id, purpose) WHERE party_id IS NOT NULL;
-- Une seule reserve par lot : sinon on provisionne deux fois.
CREATE UNIQUE INDEX IF NOT EXISTS envelope_batch_unique
  ON core.envelope (batch_id) WHERE batch_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. L'operation : ce que l'utilisateur voit, confirme, et raconte
-- ─────────────────────────────────────────────────────────────────────────
--
-- Une operation, N routes. Les ecrans « swap », « pme-envoyer » et « banque »
-- du prototype sont le meme formulaire avec la meme liste de six routes :
-- c'est le produit qui confirme qu'il n'y a pas trois objets, mais un seul.
--
-- shape dit OU se trouve l'incertitude, et c'est la seule chose qui change la
-- structure :
--   internal — nulle part. Un fait comptable, atomique.
--   outbound — en aval. On ecrit, puis on espere.
--   inbound  — en amont. On apprend, puis on ecrit.
--   swap     — inbound puis outbound, avec un sejour au milieu.

CREATE TABLE IF NOT EXISTS core.operation (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               text NOT NULL CHECK (kind IN
                     ('transfer', 'payout', 'topup', 'withdrawal', 'refund', 'settlement')),
  shape              text NOT NULL CHECK (shape IN ('internal', 'outbound', 'inbound', 'swap')),

  origin_party_id    uuid NOT NULL REFERENCES core.party(id),
  origin_envelope_id uuid REFERENCES core.envelope(id),
  recipient_id       uuid REFERENCES core.recipient(id),
  instruction_id     uuid REFERENCES core.instruction(id),

  amount_minor       bigint NOT NULL CHECK (amount_minor > 0),
  currency           text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),

  -- La route, GELEE au scellement. Sinon le devis ment.
  rail               text,
  operator           text,
  destination_value  text,
  destination_hash   bytea,
  rail_policy_id     bigint REFERENCES core.rail_policy(id),

  -- Le devis, en DEUX parts. 038 les ecrasait en un entier : c'est le litige
  -- assure, parce qu'on ne sait plus dire ce qui etait du au rail et ce qui
  -- etait du a SwimPay.
  quoted_rail_fee_minor    bigint CHECK (quoted_rail_fee_minor >= 0),
  quoted_service_fee_minor bigint CHECK (quoted_service_fee_minor >= 0),
  quoted_delay             text,
  quoted_at                timestamptz,
  -- Et ce qui a REELLEMENT ete preleve, face a ce qui avait ete annonce.
  actual_rail_fee_minor    bigint,
  actual_service_fee_minor bigint,
  settled_amount_minor     bigint,

  status             text NOT NULL DEFAULT 'draft' CHECK (status IN (
                       'draft', 'sealed', 'funded', 'submitted', 'settled',
                       'refused', 'unknown', 'cancelled', 'reversed')),
  refusal_code       text,

  -- Rattachement au lot. batch_seq fige la place de l'operation dans
  -- l'instantane : c'est lui qui rend la cle stable d'une reprise a l'autre.
  batch_id           uuid REFERENCES core.batch(id),
  batch_seq          integer,

  -- L'empreinte du contenu, fournie par l'appelant sous forme de sha256.
  -- Pour une ligne de lot, elle est REECRITE par la base (section 6) : la
  -- reprise ne peut pas fabriquer une cle neuve.
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),

  -- Derivee. Non modifiable, non fournie, non nonce-able.
  idempotency_key    text GENERATED ALWAYS AS (
                       core.cle(origin_party_id::text || '|' || kind || '|' || request_fingerprint)
                     ) STORED,

  approved_by        text,
  approved_at        timestamptz,
  sealed_at          timestamptz,
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT operation_shape_route_ck CHECK (
    (shape = 'internal' AND rail IS NULL)
    OR (shape <> 'internal' AND (status = 'draft' OR rail IS NOT NULL))
  ),
  -- Un devis en deux parts, ou pas de devis du tout. Jamais un seul chiffre.
  CONSTRAINT operation_quote_two_parts_ck CHECK (
    (quoted_rail_fee_minor IS NULL AND quoted_service_fee_minor IS NULL AND quoted_at IS NULL)
    OR (quoted_rail_fee_minor IS NOT NULL AND quoted_service_fee_minor IS NOT NULL
        AND quoted_at IS NOT NULL)
  ),
  -- Rien ne se scelle sans que le devis ait ete montre. 038 n'exigeait la
  -- trace qu'a l'execution : la base etait plus permissive que le code
  -- (instruction.ts:107 l'exige des le scellement). On corrige le sens.
  CONSTRAINT operation_quote_shown_ck CHECK (status = 'draft' OR quoted_at IS NOT NULL),
  CONSTRAINT operation_batch_shape_ck CHECK (
    (batch_id IS NULL AND batch_seq IS NULL) OR (batch_id IS NOT NULL AND batch_seq IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS operation_idempotency_unique
  ON core.operation (idempotency_key);
CREATE INDEX IF NOT EXISTS operation_party_idx
  ON core.operation (origin_party_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS operation_open_idx
  ON core.operation (status, updated_at)
  WHERE status IN ('sealed', 'funded', 'submitted', 'unknown');
CREATE UNIQUE INDEX IF NOT EXISTS operation_batch_seq_unique
  ON core.operation (batch_id, batch_seq) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS operation_dup_guard_idx
  ON core.operation (origin_party_id, destination_hash, amount_minor, created_at DESC)
  WHERE destination_hash IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Le brin : le fait comptable
-- ─────────────────────────────────────────────────────────────────────────
--
-- Une operation « sortie » se compose de DEUX brins, et c'est volontaire :
--
--   brin 1 (funding, interne, instantane)  enveloppe -> SUSPENSE_IN_TRANSIT
--   brin 2 (principal, externe, incertain) SUSPENSE_IN_TRANSIT -> rail
--
-- Le prix a payer est une ligne de plus. Ce qu'on achete : a tout instant,
-- l'argent est quelque part. « En route » n'est pas un vide entre deux
-- ecritures, c'est le solde d'un compte qu'on peut lire, vieillir et
-- reconcilier. Et si le brin 2 est refuse, le retour est un brin 3, jamais
-- une annulation du brin 1.

CREATE TABLE IF NOT EXISTS core.movement (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id   uuid NOT NULL REFERENCES core.operation(id),
  leg            text NOT NULL CHECK (leg IN
                 ('funding', 'principal', 'fee_rail', 'fee_service',
                  'return', 'reversal', 'adjustment')),
  seq            integer NOT NULL DEFAULT 1 CHECK (seq >= 1),

  amount_minor   bigint NOT NULL CHECK (amount_minor > 0),
  currency       text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),

  origin_kind            text NOT NULL CHECK (origin_kind IN ('envelope', 'internal', 'rail')),
  origin_envelope_id     uuid REFERENCES core.envelope(id),
  origin_internal_code   text REFERENCES core.internal_account(code),

  destination_kind       text NOT NULL CHECK (destination_kind IN ('envelope', 'internal', 'rail')),
  destination_envelope_id uuid REFERENCES core.envelope(id),
  destination_internal_code text REFERENCES core.internal_account(code),

  -- Le cote rail, decrit en ligne. Pas de table de contrepartie : un numero
  -- de mobile money n'est pas un compte, c'est une adresse.
  rail           text,
  operator       text,
  counterparty_value text,
  counterparty_hash  bytea,
  rail_ref       text,

  -- Ce que le rail a REELLEMENT regle, face a ce qu'on avait demande.
  settled_amount_minor bigint,

  status         text NOT NULL DEFAULT 'sealed' CHECK (status IN
                 ('sealed', 'submitted', 'settled', 'refused', 'unknown', 'cancelled')),
  reason_code    text,
  attempts       integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz,

  -- La preuve. Un brin externe ne passe a « settled » que sur un evenement
  -- fournisseur enregistre, jamais sur l'expiration d'un delai.
  proof_event_id bigint REFERENCES core.external_event(id),
  -- La sortie d'incertitude par un humain, quand le rail ne sait plus.
  resolution_ref text,
  resolved_by    text,

  -- Le brin qui a finance celui-ci : c'est par la que le retour repart.
  funded_by_movement_id uuid REFERENCES core.movement(id),
  -- Le brin compensatoire, quand il a fallu en ecrire un. Rien ne s'annule.
  reversal_of_movement_id uuid REFERENCES core.movement(id),

  is_external    boolean GENERATED ALWAYS AS
                 (origin_kind = 'rail' OR destination_kind = 'rail') STORED,

  -- Derivee du contenu et STABLE dans le temps : deux sessions, une reprise
  -- apres coupure, un rechargement de page produisent la MEME cle.
  idempotency_key text GENERATED ALWAYS AS (
    core.cle(
      operation_id::text || '|' || leg || '|' || seq::text || '|' ||
      origin_kind || ':' || coalesce(origin_envelope_id::text, origin_internal_code, '-') || '|' ||
      destination_kind || ':' ||
        coalesce(destination_envelope_id::text, destination_internal_code, '-') || '|' ||
      coalesce(rail, '-') || ':' || coalesce(operator, '-') || ':' ||
        coalesce(encode(counterparty_hash, 'hex'), '-') || '|' ||
      amount_minor::text || '|' || currency
    )
  ) STORED,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  settled_at     timestamptz,

  -- Exactement un porteur d'origine, de la nature declaree.
  CONSTRAINT movement_origin_shape_ck CHECK (
    (origin_kind = 'envelope' AND origin_envelope_id IS NOT NULL AND origin_internal_code IS NULL)
    OR (origin_kind = 'internal' AND origin_internal_code IS NOT NULL AND origin_envelope_id IS NULL)
    OR (origin_kind = 'rail' AND origin_envelope_id IS NULL AND origin_internal_code IS NULL)
  ),
  CONSTRAINT movement_destination_shape_ck CHECK (
    (destination_kind = 'envelope' AND destination_envelope_id IS NOT NULL
      AND destination_internal_code IS NULL)
    OR (destination_kind = 'internal' AND destination_internal_code IS NOT NULL
      AND destination_envelope_id IS NULL)
    OR (destination_kind = 'rail' AND destination_envelope_id IS NULL
      AND destination_internal_code IS NULL)
  ),
  -- Un brin ne va pas d'un rail a un rail : ce serait deux operations, avec
  -- un sejour au milieu. C'est ce qu'on appelle un swap, et il se compose.
  CONSTRAINT movement_not_rail_to_rail_ck CHECK (
    NOT (origin_kind = 'rail' AND destination_kind = 'rail')
  ),
  -- L'argent ne va pas de quelque part vers le meme endroit.
  CONSTRAINT movement_no_self_ck CHECK (
    origin_kind <> destination_kind
    OR coalesce(origin_envelope_id::text, origin_internal_code, '') <>
       coalesce(destination_envelope_id::text, destination_internal_code, '')
  ),
  -- Cote rail : le rail est nomme, sinon on ne sait pas a qui on parle.
  CONSTRAINT movement_rail_named_ck CHECK (
    (origin_kind <> 'rail' AND destination_kind <> 'rail' AND rail IS NULL)
    OR ((origin_kind = 'rail' OR destination_kind = 'rail') AND rail IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS movement_idempotency_unique
  ON core.movement (idempotency_key);
-- Un seul brin par (operation, jambe, rang). L'unicite est tenue par Postgres,
-- pas par la discipline de l'appelant.
CREATE UNIQUE INDEX IF NOT EXISTS movement_leg_unique
  ON core.movement (operation_id, leg, seq);
CREATE INDEX IF NOT EXISTS movement_open_idx
  ON core.movement (status, updated_at) WHERE status IN ('sealed', 'submitted', 'unknown');
CREATE INDEX IF NOT EXISTS movement_rail_ref_idx ON core.movement (rail, rail_ref)
  WHERE rail_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS movement_origin_env_idx ON core.movement (origin_envelope_id)
  WHERE origin_envelope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS movement_dest_env_idx ON core.movement (destination_envelope_id)
  WHERE destination_envelope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS movement_operation_idx ON core.movement (operation_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Le lot : les lignes, l'instantane, les approbations
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.batch_line (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     uuid NOT NULL REFERENCES core.batch(id),
  seq          integer NOT NULL CHECK (seq >= 1),
  recipient_id uuid NOT NULL REFERENCES core.recipient(id),
  -- L'instantane du destinataire au moment du scellement. Le carnet peut
  -- changer apres : ce qui a ete approuve ne change pas.
  recipient_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  -- La route resolue ligne par ligne : une meme paie melange l'interne et
  -- l'externe. resousRoute() du prototype rend « pret » ou « externe » PAR
  -- EMPLOYE : c'est un fait produit, il doit etre un fait de schema.
  route_kind   text NOT NULL DEFAULT 'unresolved'
               CHECK (route_kind IN ('unresolved', 'internal', 'external')),
  rail         text,
  operator     text,
  destination_value text,
  destination_hash  bytea,
  quoted_rail_fee_minor    bigint,
  quoted_service_fee_minor bigint,

  operation_id uuid REFERENCES core.operation(id),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN
               ('pending', 'blocked', 'ready', 'executing', 'settled',
                'refused', 'unknown', 'skipped')),
  blocked_reason text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- UNE ligne par beneficiaire et par lot. C'est le filet le plus simple contre
-- « payer deux fois la paie d'aout », et c'est Postgres qui le tient.
CREATE UNIQUE INDEX IF NOT EXISTS batch_line_recipient_unique
  ON core.batch_line (batch_id, recipient_id);
CREATE UNIQUE INDEX IF NOT EXISTS batch_line_seq_unique ON core.batch_line (batch_id, seq);
CREATE UNIQUE INDEX IF NOT EXISTS batch_line_operation_unique
  ON core.batch_line (operation_id) WHERE operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS batch_line_status_idx ON core.batch_line (batch_id, status);

-- Qui a approuve QUOI. L'approbation porte sur l'empreinte de l'instantane :
-- si la liste change, l'approbation ne vaut plus. C'est le correctif du bug
-- du prototype ou le perimetre est lu au moment du clic (visiblesEq / filtreEq)
-- et non au moment de l'approbation.
CREATE TABLE IF NOT EXISTS core.batch_approval (
  id            bigserial PRIMARY KEY,
  batch_id      uuid NOT NULL REFERENCES core.batch(id),
  snapshot_hash text NOT NULL,
  approver      text NOT NULL,
  method        text NOT NULL CHECK (method IN ('pin', 'otp', 'second_account', 'api_key')),
  proof_ref     text,
  at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS batch_approval_unique
  ON core.batch_approval (batch_id, snapshot_hash, approver);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Ce qui rend les invariants INVIOLABLES
-- ─────────────────────────────────────────────────────────────────────────

-- 6.1 Le solde n'est jamais ecrit a la main.
--     Accident evite : une correction ops, un ORM bavard ou un bug applicatif
--     qui cree de l'argent en posant un chiffre dans une colonne.
CREATE OR REPLACE FUNCTION core.envelope_balance_is_derived() RETURNS trigger AS $derive$
BEGIN
  IF NEW.balance_minor IS DISTINCT FROM OLD.balance_minor
     AND coalesce(current_setting('core.ledger', true), 'off') <> 'on' THEN
    RAISE EXCEPTION
      'core.envelope : le solde ne s ecrit pas, il se derive des brins (core.movement)';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$derive$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS envelope_balance_derived ON core.envelope;
CREATE TRIGGER envelope_balance_derived
  BEFORE UPDATE ON core.envelope
  FOR EACH ROW EXECUTE FUNCTION core.envelope_balance_is_derived();

CREATE OR REPLACE FUNCTION core.internal_balance_is_derived() RETURNS trigger AS $derivei$
BEGIN
  IF NEW.balance_minor IS DISTINCT FROM OLD.balance_minor
     AND coalesce(current_setting('core.ledger', true), 'off') <> 'on' THEN
    RAISE EXCEPTION
      'core.internal_account : le solde ne s ecrit pas, il se derive des brins';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$derivei$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS internal_balance_derived ON core.internal_account;
CREATE TRIGGER internal_balance_derived
  BEFORE UPDATE ON core.internal_account
  FOR EACH ROW EXECUTE FUNCTION core.internal_balance_is_derived();

-- 6.2 Les enveloppes n'existent pas tant que l'arbitrage n'est pas rendu.
--     Accident evite : livrer une UI de custody sur un schema de pass-through,
--     c'est-a-dire promettre un solde qu'aucune contrepartie n'autorise.
CREATE OR REPLACE FUNCTION core.envelope_requires_custody() RETURNS trigger AS $cust$
BEGIN
  IF core.mode_argent() <> 'custody' THEN
    RAISE EXCEPTION
      'core.envelope : mode « % ». Une position par client suppose l arbitrage tranche (core.money_model).',
      core.mode_argent();
  END IF;
  RETURN NEW;
END;
$cust$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS envelope_custody_only ON core.envelope;
CREATE TRIGGER envelope_custody_only
  BEFORE INSERT ON core.envelope
  FOR EACH ROW EXECUTE FUNCTION core.envelope_requires_custody();

-- 6.3 La machine a etats du brin, transitions exhaustives.
--     Accident evite : un versement refuse remis a « settled » par une reprise
--     maladroite (donc paye deux fois), ou une incertitude rangee dans
--     « failed » puis rejouee a l'aveugle.
CREATE OR REPLACE FUNCTION core.movement_transition_guard() RETURNS trigger AS $mt$
DECLARE
  permis constant jsonb := '{
    "sealed":    ["submitted", "settled", "cancelled"],
    "submitted": ["settled", "refused", "unknown"],
    "unknown":   ["settled", "refused"],
    "settled":   [],
    "refused":   [],
    "cancelled": []
  }'::jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (permis -> OLD.status) ? NEW.status THEN
      RAISE EXCEPTION 'core.movement : transition interdite % vers % (brin %)',
        OLD.status, NEW.status, OLD.id;
    END IF;
    -- Un brin interne ne passe pas par « submitted » : il n'y a rien a
    -- soumettre. Un brin externe ne saute pas directement a « settled ».
    IF NEW.status = 'submitted' AND NOT OLD.is_external THEN
      RAISE EXCEPTION 'core.movement : un brin interne n a rien a soumettre (brin %)', OLD.id;
    END IF;
    IF NEW.status = 'settled' AND OLD.is_external AND OLD.status = 'sealed' THEN
      RAISE EXCEPTION 'core.movement : un brin externe passe par « submitted » (brin %)', OLD.id;
    END IF;
    -- La preuve. Un rail ne « reussit » pas parce qu un delai a expire.
    -- Note : une colonne GENERATED n est calculee qu APRES les triggers BEFORE.
    -- On lit donc OLD.is_external (la ligne stockee), jamais NEW.is_external.
    IF NEW.status = 'settled' AND OLD.is_external AND NEW.proof_event_id IS NULL THEN
      RAISE EXCEPTION
        'core.movement : pas de reglement externe sans preuve fournisseur (brin %)', OLD.id;
    END IF;
    -- Sortir de l incertitude demande une reponse, pas une decision.
    IF OLD.status = 'unknown'
       AND NEW.proof_event_id IS NULL AND NEW.resolution_ref IS NULL THEN
      RAISE EXCEPTION
        'core.movement : on sort de « unknown » par getStatus ou par un arbitrage trace (brin %)',
        OLD.id;
    END IF;
  ELSIF OLD.status IN ('settled', 'refused', 'cancelled') THEN
    -- Un brin termine est un fait. On n en corrige pas le contenu : on ecrit
    -- un brin compensatoire.
    IF NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
       OR NEW.origin_kind IS DISTINCT FROM OLD.origin_kind
       OR NEW.destination_kind IS DISTINCT FROM OLD.destination_kind
       OR NEW.origin_envelope_id IS DISTINCT FROM OLD.origin_envelope_id
       OR NEW.destination_envelope_id IS DISTINCT FROM OLD.destination_envelope_id
       OR NEW.origin_internal_code IS DISTINCT FROM OLD.origin_internal_code
       OR NEW.destination_internal_code IS DISTINCT FROM OLD.destination_internal_code
       OR NEW.leg IS DISTINCT FROM OLD.leg
       OR NEW.operation_id IS DISTINCT FROM OLD.operation_id THEN
      RAISE EXCEPTION
        'core.movement : un brin termine ne se corrige pas, il se compense (brin %)', OLD.id;
    END IF;
  END IF;

  -- La route et le montant ne bougent pas non plus avant le terme : le devis
  -- montre a l utilisateur porte sur CE contenu.
  IF NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.rail IS DISTINCT FROM OLD.rail THEN
    RAISE EXCEPTION 'core.movement : le montant et la route sont geles au scellement (brin %)',
      OLD.id;
  END IF;

  NEW.updated_at := now();
  IF NEW.status = 'settled' AND NEW.settled_at IS NULL THEN NEW.settled_at := now(); END IF;
  RETURN NEW;
END;
$mt$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movement_transitions ON core.movement;
CREATE TRIGGER movement_transitions
  BEFORE UPDATE ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.movement_transition_guard();

-- 6.4 A la naissance : un brin externe ne nait ni soumis ni regle sans preuve,
--     et on ne rejoue JAMAIS une jambe dont une instance est « unknown ».
--     Accident evite : le double payout. C'est la regle deja ecrite pour la DGI
--     (07_SPEC §3, « jamais de retry aveugle, single-flight ») et qui manquait
--     du cote de l argent, ou elle coute plus cher qu un sticker.
CREATE OR REPLACE FUNCTION core.movement_birth_guard() RETURNS trigger AS $mb$
DECLARE
  incertain integer;
BEGIN
  -- is_external est GENERATED : elle vaut NULL dans un trigger BEFORE. On la
  -- recalcule ici, sinon le garde-fou serait silencieusement inactif.
  IF NEW.status = 'settled'
     AND (NEW.origin_kind = 'rail' OR NEW.destination_kind = 'rail')
     AND NEW.proof_event_id IS NULL THEN
    RAISE EXCEPTION 'core.movement : un brin externe ne nait pas regle sans preuve fournisseur';
  END IF;
  IF NEW.status NOT IN ('sealed', 'settled') THEN
    RAISE EXCEPTION 'core.movement : un brin nait « sealed » (ou « settled » s il est interne)';
  END IF;

  SELECT count(*) INTO incertain
  FROM core.movement m
  WHERE m.operation_id = NEW.operation_id AND m.leg = NEW.leg AND m.status = 'unknown';
  IF incertain > 0 THEN
    RAISE EXCEPTION
      'core.movement : la jambe « % » de l operation % est incertaine. On interroge le rail, on ne rejoue pas.',
      NEW.leg, NEW.operation_id;
  END IF;

  IF NEW.status = 'settled' AND NEW.settled_at IS NULL THEN NEW.settled_at := now(); END IF;
  RETURN NEW;
END;
$mb$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movement_birth ON core.movement;
CREATE TRIGGER movement_birth
  BEFORE INSERT ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.movement_birth_guard();

-- 6.5 L application des effets : le SEUL endroit ou un solde bouge.
--     Verrouillage dans un ordre canonique (enveloppes par id, comptes
--     internes par code) : deux lots concurrents ne s interbloquent pas.
--     Accident evite : le decouvert silencieux de pmeCta (Math.max(0, ...)),
--     et la reserve fractionnaire par accident du cote des comptes internes.
CREATE OR REPLACE FUNCTION core.movement_apply_effect() RETURNS trigger AS $eff$
BEGIN
  IF NEW.status <> 'settled' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'settled' THEN RETURN NULL; END IF;

  PERFORM 1 FROM core.envelope
   WHERE id IN (NEW.origin_envelope_id, NEW.destination_envelope_id)
   ORDER BY id FOR UPDATE;
  PERFORM 1 FROM core.internal_account
   WHERE code IN (NEW.origin_internal_code, NEW.destination_internal_code)
   ORDER BY code FOR UPDATE;

  PERFORM set_config('core.ledger', 'on', true);

  IF NEW.origin_kind = 'envelope' THEN
    UPDATE core.envelope SET balance_minor = balance_minor - NEW.amount_minor
      WHERE id = NEW.origin_envelope_id;
  ELSIF NEW.origin_kind = 'internal' THEN
    UPDATE core.internal_account SET balance_minor = balance_minor - NEW.amount_minor
      WHERE code = NEW.origin_internal_code;
  END IF;

  IF NEW.destination_kind = 'envelope' THEN
    UPDATE core.envelope SET balance_minor = balance_minor + NEW.amount_minor
      WHERE id = NEW.destination_envelope_id;
  ELSIF NEW.destination_kind = 'internal' THEN
    UPDATE core.internal_account SET balance_minor = balance_minor + NEW.amount_minor
      WHERE code = NEW.destination_internal_code;
  END IF;

  PERFORM set_config('core.ledger', 'off', true);

  -- Le rail a regle un autre montant que celui demande : on ne le corrige pas
  -- en silence, on le fait constater.
  IF NEW.settled_amount_minor IS NOT NULL
     AND NEW.settled_amount_minor <> NEW.amount_minor THEN
    INSERT INTO core.exception_queue (kind, payload)
    VALUES ('amount_mismatch', jsonb_build_object(
      'movement_id', NEW.id, 'operation_id', NEW.operation_id,
      'demande_minor', NEW.amount_minor, 'regle_minor', NEW.settled_amount_minor,
      'rail', NEW.rail, 'rail_ref', NEW.rail_ref));
  END IF;
  RETURN NULL;
END;
$eff$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movement_effect_insert ON core.movement;
CREATE TRIGGER movement_effect_insert
  AFTER INSERT ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.movement_apply_effect();

DROP TRIGGER IF EXISTS movement_effect_update ON core.movement;
CREATE TRIGGER movement_effect_update
  AFTER UPDATE OF status ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.movement_apply_effect();

-- 6.6 Le retour automatique : un brin principal refuse rend l argent au
--     financeur, par un NOUVEAU brin. La base l ecrit elle-meme, parce qu une
--     regle qui depend de la bonne volonte de l appelant n est pas une regle.
--     Accident evite : de l argent gele en suspens indefiniment apres un refus
--     de rail, invisible au client et introuvable au recomptage.
CREATE OR REPLACE FUNCTION core.movement_auto_return() RETURNS trigger AS $ret$
DECLARE
  fin core.movement%ROWTYPE;
BEGIN
  IF NEW.status <> 'refused' OR NEW.leg <> 'principal' THEN RETURN NULL; END IF;
  IF NEW.funded_by_movement_id IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM core.movement WHERE operation_id = NEW.operation_id AND leg = 'return')
    THEN RETURN NULL; END IF;

  SELECT * INTO fin FROM core.movement WHERE id = NEW.funded_by_movement_id;
  IF fin.status <> 'settled' THEN RETURN NULL; END IF;

  INSERT INTO core.movement (
    operation_id, leg, seq, amount_minor,
    origin_kind, origin_internal_code, origin_envelope_id,
    destination_kind, destination_envelope_id, destination_internal_code,
    status, reason_code, reversal_of_movement_id)
  VALUES (
    NEW.operation_id, 'return', 1, fin.amount_minor,
    fin.destination_kind, fin.destination_internal_code, fin.destination_envelope_id,
    fin.origin_kind, fin.origin_envelope_id, fin.origin_internal_code,
    'settled', coalesce(NEW.reason_code, 'rail_refused'), NEW.id);
  RETURN NULL;
END;
$ret$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movement_auto_return_trg ON core.movement;
CREATE TRIGGER movement_auto_return_trg
  AFTER UPDATE OF status ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.movement_auto_return();

-- 6.7 L incertitude tombe en file, toute seule.
--     Accident evite : un « en cours » qui traine trois semaines parce que
--     personne ne regarde une colonne.
CREATE OR REPLACE FUNCTION core.movement_unknown_to_queue() RETURNS trigger AS $unk$
BEGIN
  IF NEW.status <> 'unknown' THEN RETURN NULL; END IF;
  INSERT INTO core.exception_queue (kind, payload)
  VALUES ('movement_unknown', jsonb_build_object(
    'movement_id', NEW.id, 'operation_id', NEW.operation_id, 'leg', NEW.leg,
    'rail', NEW.rail, 'rail_ref', NEW.rail_ref, 'amount_minor', NEW.amount_minor,
    'regle', 'on interroge getStatus ; aucun rejeu tant que ce brin est incertain'));
  RETURN NULL;
END;
$unk$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movement_unknown_queue ON core.movement;
CREATE TRIGGER movement_unknown_queue
  AFTER UPDATE OF status ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.movement_unknown_to_queue();

-- 6.8 Rien ne se supprime. 037 ne l imposait qu a trois tables ; l argent en
--     faisait partie pour zero.
CREATE OR REPLACE FUNCTION core.refuse_delete() RETURNS trigger AS $nodel$
BEGIN
  RAISE EXCEPTION 'core.% ne se supprime pas (correction = nouvel enregistrement)', TG_TABLE_NAME;
END;
$nodel$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movement_no_delete ON core.movement;
CREATE TRIGGER movement_no_delete BEFORE DELETE ON core.movement
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS operation_no_delete ON core.operation;
CREATE TRIGGER operation_no_delete BEFORE DELETE ON core.operation
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS batch_no_delete ON core.batch;
CREATE TRIGGER batch_no_delete BEFORE DELETE ON core.batch
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS batch_approval_append_only ON core.batch_approval;
CREATE TRIGGER batch_approval_append_only BEFORE UPDATE OR DELETE ON core.batch_approval
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

-- Et les tables de 037 que la regle « rien ne se supprime » nommait sans que
-- rien ne l applique.
DROP TRIGGER IF EXISTS sale_no_delete ON core.sale;
CREATE TRIGGER sale_no_delete BEFORE DELETE ON core.sale
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS invoice_no_delete ON core.invoice;
CREATE TRIGGER invoice_no_delete BEFORE DELETE ON core.invoice
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS match_no_delete ON core.match;
CREATE TRIGGER match_no_delete BEFORE DELETE ON core.match
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS payment_intent_no_delete ON core.payment_intent;
CREATE TRIGGER payment_intent_no_delete BEFORE DELETE ON core.payment_intent
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();
DROP TRIGGER IF EXISTS instruction_no_delete ON core.instruction;
CREATE TRIGGER instruction_no_delete BEFORE DELETE ON core.instruction
  FOR EACH ROW EXECUTE FUNCTION core.refuse_delete();

-- 6.9 L operation : machine a etats, route gelee, et soupcon de doublon.
CREATE OR REPLACE FUNCTION core.operation_transition_guard() RETURNS trigger AS $ot$
DECLARE
  permis constant jsonb := '{
    "draft":     ["sealed", "cancelled"],
    "sealed":    ["funded", "submitted", "settled", "refused", "cancelled"],
    "funded":    ["submitted", "settled", "refused", "cancelled"],
    "submitted": ["settled", "refused", "unknown"],
    "unknown":   ["settled", "refused"],
    "settled":   ["reversed"],
    "refused":   [],
    "cancelled": [],
    "reversed":  []
  }'::jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (permis -> OLD.status) ? NEW.status THEN
      RAISE EXCEPTION 'core.operation : transition interdite % vers % (operation %)',
        OLD.status, NEW.status, OLD.id;
    END IF;
  END IF;

  -- La route est gelee des le scellement : le devis porte sur elle.
  IF OLD.status <> 'draft' THEN
    IF NEW.rail IS DISTINCT FROM OLD.rail
       OR NEW.operator IS DISTINCT FROM OLD.operator
       OR NEW.destination_hash IS DISTINCT FROM OLD.destination_hash
       OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
       OR NEW.quoted_rail_fee_minor IS DISTINCT FROM OLD.quoted_rail_fee_minor
       OR NEW.quoted_service_fee_minor IS DISTINCT FROM OLD.quoted_service_fee_minor
       OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint THEN
      RAISE EXCEPTION
        'core.operation : la route, le montant et le devis sont geles au scellement (operation %)',
        OLD.id;
    END IF;
  END IF;

  NEW.updated_at := now();
  IF NEW.status <> 'draft' AND NEW.sealed_at IS NULL THEN NEW.sealed_at := now(); END IF;
  RETURN NEW;
END;
$ot$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS operation_transitions ON core.operation;
CREATE TRIGGER operation_transitions
  BEFORE UPDATE ON core.operation
  FOR EACH ROW EXECUTE FUNCTION core.operation_transition_guard();

-- L empreinte d une ligne de lot est calculee PAR LA BASE, a partir du lot,
-- du rang, du destinataire et du montant. Une reprise apres coupure ne peut
-- donc pas fabriquer une cle neuve, donc pas payer deux fois.
CREATE OR REPLACE FUNCTION core.operation_fingerprint_from_batch() RETURNS trigger AS $fp$
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    NEW.request_fingerprint := core.cle(
      NEW.batch_id::text || '|' || NEW.batch_seq::text || '|' ||
      coalesce(NEW.recipient_id::text, '-') || '|' || NEW.amount_minor::text);
  END IF;
  RETURN NEW;
END;
$fp$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS operation_batch_fingerprint ON core.operation;
CREATE TRIGGER operation_batch_fingerprint
  BEFORE INSERT ON core.operation
  FOR EACH ROW EXECUTE FUNCTION core.operation_fingerprint_from_batch();

-- Le soupcon de doublon : meme payeur, meme destination, meme montant, dans
-- une fenetre courte. On ne bloque pas (un loyer peut se payer deux fois),
-- on fait constater. C est le seul filet contre « payer deux fois la paie ».
CREATE OR REPLACE FUNCTION core.operation_duplicate_watch() RETURNS trigger AS $dup$
DECLARE
  n integer;
BEGIN
  IF NEW.destination_hash IS NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO n FROM core.operation o
   WHERE o.id <> NEW.id
     AND o.origin_party_id = NEW.origin_party_id
     AND o.destination_hash = NEW.destination_hash
     AND o.amount_minor = NEW.amount_minor
     AND o.status NOT IN ('cancelled', 'refused')
     AND o.created_at > now() - interval '10 minutes';
  IF n > 0 THEN
    INSERT INTO core.exception_queue (merchant_party_id, kind, payload)
    VALUES (NEW.origin_party_id, 'duplicate_suspected', jsonb_build_object(
      'operation_id', NEW.id, 'amount_minor', NEW.amount_minor, 'jumelles', n));
  END IF;
  RETURN NULL;
END;
$dup$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS operation_duplicate_watch_trg ON core.operation;
CREATE TRIGGER operation_duplicate_watch_trg
  AFTER INSERT ON core.operation
  FOR EACH ROW EXECUTE FUNCTION core.operation_duplicate_watch();

-- 6.10 L instantane du lot est gele au scellement.
--      Accident evite : approuver cinq salaires filtres sur « Production » et
--      en payer trente parce que le filtre a change entre-temps.
CREATE OR REPLACE FUNCTION core.batch_snapshot_is_frozen() RETURNS trigger AS $snap$
DECLARE
  etat text;
  cible uuid;
BEGIN
  -- Rien ne se supprime : retirer quelqu un d un lot, c est passer sa ligne a
  -- « skipped », pas l effacer. Sinon on ne saura jamais qui a ete retire.
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'core.batch_line ne se supprime pas : une ligne retiree passe a « skipped » (lot %)',
      OLD.batch_id;
  END IF;

  cible := NEW.batch_id;
  SELECT status INTO etat FROM core.batch WHERE id = cible;
  IF etat = 'draft' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION
      'core.batch_line : le perimetre du lot % est gele (statut %). Un nouveau perimetre est un nouveau lot.',
      cible, etat;
  END IF;
  IF NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.seq IS DISTINCT FROM OLD.seq
     OR NEW.destination_hash IS DISTINCT FROM OLD.destination_hash
     OR NEW.rail IS DISTINCT FROM OLD.rail THEN
    RAISE EXCEPTION
      'core.batch_line : ce qui a ete approuve ne change pas (lot %, ligne %)', cible, OLD.seq;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$snap$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS batch_line_frozen ON core.batch_line;
CREATE TRIGGER batch_line_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON core.batch_line
  FOR EACH ROW EXECUTE FUNCTION core.batch_snapshot_is_frozen();

-- 6.11 La machine a etats du lot, l empreinte, les approbations, la reserve.
--      Accidents evites : executer un lot sans approbation valide ; executer
--      un lot non provisionne (le decouvert silencieux) ; refaire un lot deja
--      execute ; annuler un lot dont une partie est deja partie.
CREATE OR REPLACE FUNCTION core.batch_transition_guard() RETURNS trigger AS $bt$
DECLARE
  permis constant jsonb := '{
    "draft":             ["sealed", "cancelled"],
    "sealed":            ["approved", "cancelled"],
    "approved":          ["funded", "executing", "cancelled"],
    "funded":            ["executing", "cancelled"],
    "executing":         ["settled", "partially_settled"],
    "settled":           ["closed"],
    "partially_settled": ["executing", "closed"],
    "closed":            [],
    "cancelled":         []
  }'::jsonb;
  n_appro integer;
  reserve bigint;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (permis -> OLD.status) ? NEW.status THEN
      RAISE EXCEPTION 'core.batch : transition interdite % vers % (lot %)',
        OLD.status, NEW.status, OLD.id;
    END IF;

    IF NEW.status = 'sealed' THEN
      -- L empreinte de l instantane : l ordre des lignes, leur destinataire,
      -- leur montant. Deux lots identiques ont la meme empreinte ; un lot
      -- dont une ligne a bouge en a une autre, et les approbations tombent.
      SELECT core.cle(string_agg(
               l.seq::text || ':' || l.recipient_id::text || ':' || l.amount_minor::text,
               '|' ORDER BY l.seq))
        INTO NEW.snapshot_hash
        FROM core.batch_line l WHERE l.batch_id = OLD.id AND l.status <> 'skipped';
      IF NEW.snapshot_hash IS NULL THEN
        RAISE EXCEPTION 'core.batch : un lot vide ne se scelle pas (lot %)', OLD.id;
      END IF;
      SELECT count(*), coalesce(sum(amount_minor), 0)
        INTO NEW.line_count, NEW.total_amount_minor
        FROM core.batch_line WHERE batch_id = OLD.id AND status <> 'skipped';
      NEW.sealed_at := now();
    END IF;

    IF NEW.status = 'executing' THEN
      SELECT count(*) INTO n_appro FROM core.batch_approval a
       WHERE a.batch_id = OLD.id AND a.snapshot_hash = OLD.snapshot_hash;
      IF n_appro < OLD.approvals_required THEN
        RAISE EXCEPTION
          'core.batch : % approbation(s) sur % pour cet instantane exact (lot %)',
          n_appro, OLD.approvals_required, OLD.id;
      END IF;
      IF OLD.funding_mode = 'reserve' THEN
        SELECT balance_minor INTO reserve FROM core.envelope WHERE batch_id = OLD.id;
        IF reserve IS NULL THEN
          RAISE EXCEPTION 'core.batch : aucune reserve provisionnee (lot %)', OLD.id;
        END IF;
        IF reserve < OLD.total_amount_minor THEN
          RAISE EXCEPTION
            'core.batch : reserve % pour % a verser. Un lot ne part pas a decouvert (lot %).',
            reserve, OLD.total_amount_minor, OLD.id;
        END IF;
      END IF;
    END IF;

    IF NEW.status = 'cancelled' AND EXISTS (
         SELECT 1 FROM core.batch_line
          WHERE batch_id = OLD.id AND status IN ('executing', 'settled', 'unknown')) THEN
      RAISE EXCEPTION
        'core.batch : une partie du lot % est deja partie. Un lot entame ne s annule pas, il se solde.',
        OLD.id;
    END IF;

    IF NEW.status = 'closed' AND OLD.funding_mode = 'reserve' THEN
      SELECT balance_minor INTO reserve FROM core.envelope WHERE batch_id = OLD.id;
      IF reserve > 0 THEN
        RAISE EXCEPTION
          'core.batch : reliquat de % en reserve. Il se rend par un brin, pas par une cloture (lot %).',
          reserve, OLD.id;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$bt$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS batch_transitions ON core.batch;
CREATE TRIGGER batch_transitions
  BEFORE UPDATE ON core.batch
  FOR EACH ROW EXECUTE FUNCTION core.batch_transition_guard();

-- 6.12 Une ligne de lot terminee ne se re-execute pas, et une ligne incertaine
--      ne repart jamais. « Reprendre » n est pas « refaire ».
CREATE OR REPLACE FUNCTION core.batch_line_status_guard() RETURNS trigger AS $bl$
DECLARE
  permis constant jsonb := '{
    "pending":   ["ready", "blocked", "skipped"],
    "blocked":   ["ready", "skipped"],
    "ready":     ["executing", "blocked", "skipped"],
    "executing": ["settled", "refused", "unknown"],
    "unknown":   ["settled", "refused"],
    "refused":   ["ready"],
    "settled":   [],
    "skipped":   ["ready"]
  }'::jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (permis -> OLD.status) ? NEW.status THEN
      RAISE EXCEPTION
        'core.batch_line : transition interdite % vers % (lot %, ligne %)',
        OLD.status, NEW.status, OLD.batch_id, OLD.seq;
    END IF;
  END IF;
  RETURN NEW;
END;
$bl$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS batch_line_status ON core.batch_line;
CREATE TRIGGER batch_line_status
  BEFORE UPDATE OF status ON core.batch_line
  FOR EACH ROW EXECUTE FUNCTION core.batch_line_status_guard();

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Ce qui se lit
-- ─────────────────────────────────────────────────────────────────────────

-- L argent en route : ni chez le payeur, ni chez le destinataire. C est le
-- chiffre que personne ne pouvait produire avant, et celui qui vieillit mal.
CREATE OR REPLACE VIEW core.v_argent_en_route AS
SELECT m.rail,
       count(*) AS brins,
       sum(m.amount_minor) AS montant_minor,
       min(m.updated_at) AS plus_ancien,
       count(*) FILTER (WHERE m.status = 'unknown') AS incertains
FROM core.movement m
WHERE m.status IN ('submitted', 'unknown')
GROUP BY m.rail;

-- 28 sur 30, lisible. L etat que le prototype ne sait pas dessiner.
CREATE OR REPLACE VIEW core.v_lot_avancement AS
SELECT b.id AS batch_id, b.label, b.status, b.line_count, b.total_amount_minor,
       count(l.*) FILTER (WHERE l.status = 'settled')   AS payes,
       count(l.*) FILTER (WHERE l.status = 'refused')   AS refuses,
       count(l.*) FILTER (WHERE l.status = 'unknown')   AS incertains,
       count(l.*) FILTER (WHERE l.status IN ('pending', 'blocked', 'ready')) AS restants,
       coalesce(sum(l.amount_minor) FILTER (WHERE l.status = 'settled'), 0) AS paye_minor,
       (SELECT e.balance_minor FROM core.envelope e WHERE e.batch_id = b.id) AS reserve_minor
FROM core.batch b
LEFT JOIN core.batch_line l ON l.batch_id = b.id
GROUP BY b.id;

-- Le devis annonce contre le devis reel, operation par operation.
CREATE OR REPLACE VIEW core.v_ecart_de_frais AS
SELECT o.id AS operation_id, o.origin_party_id, o.rail,
       o.quoted_rail_fee_minor, o.actual_rail_fee_minor,
       o.quoted_service_fee_minor, o.actual_service_fee_minor,
       coalesce(o.actual_rail_fee_minor, 0) - coalesce(o.quoted_rail_fee_minor, 0)
         AS ecart_rail_minor,
       coalesce(o.actual_service_fee_minor, 0) - coalesce(o.quoted_service_fee_minor, 0)
         AS ecart_service_minor
FROM core.operation o
WHERE o.status = 'settled'
  AND (o.actual_rail_fee_minor IS DISTINCT FROM o.quoted_rail_fee_minor
       OR o.actual_service_fee_minor IS DISTINCT FROM o.quoted_service_fee_minor);

-- Le solde recalcule depuis les brins, face au solde stocke. Le jour ou les
-- deux different, c est que quelqu un a contourne les triggers.
CREATE OR REPLACE VIEW core.v_controle_position AS
SELECT e.id AS envelope_id, e.party_id, e.batch_id, e.purpose, e.balance_minor AS stocke_minor,
       coalesce((SELECT sum(m.amount_minor) FROM core.movement m
                  WHERE m.destination_envelope_id = e.id AND m.status = 'settled'), 0)
       - coalesce((SELECT sum(m.amount_minor) FROM core.movement m
                    WHERE m.origin_envelope_id = e.id AND m.status = 'settled'), 0)
       AS derive_minor
FROM core.envelope e;
