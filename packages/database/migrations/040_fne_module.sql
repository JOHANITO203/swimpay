-- 039 — Le module FNE : ce que 037 ne peut pas porter.
--
-- 037 a pose core.invoice. Il lui manque tout ce qui rend la certification
-- SURVIVABLE. Rappel des trois faits de l'API DGI (procedure officielle de mai
-- 2025) qui commandent chaque table ci-dessous :
--
--   1. aucune idempotence : deux POST identiques = deux factures certifiees,
--      deux numeros dans la serie annuelle du marchand, deux stickers ;
--   2. aucune lecture : trois POST, zero GET. Apres un timeout, aucune machine
--      ne sait si la facture existe. Seul un humain, dans l'espace FNE, le sait ;
--   3. la seule correction possible est l'avoir, et il ne porte que sur des
--      couples (id d'article DGI, quantite) — ids qui ne se lisent QUE dans la
--      reponse de certification.
--
-- Ce que 037 ne sait pas dire, et que 039 ajoute :
--   * l'INCERTITUDE n'est pas representable (`fne_status` ne l'admet pas) ;
--   * rien n'est ecrit AVANT l'envoi, donc un crash en vol est indetectable ;
--   * `invoice.id` et `invoice.items[].id` de la DGI sont jetes, donc aucun
--     avoir n'est possible apres coup ;
--   * le solde de stickers est un instantane ecrase, donc la baisse
--     inexpliquee — notre seul oracle — est invisible ;
--   * la cle API du marchand n'est stockee nulle part ;
--   * rien n'empeche d'envoyer une donnee de production vers l'environnement
--     de test, qui est en HTTP CLAIR sur une IP brute.
--
-- L'invariant que ce fichier fait tenir a la BASE, et pas a la bonne volonte
-- de l'appelant :
--
--   AUCUN OCTET NE PART SANS LIGNE `core.fne_attempt` COMMITEE.
--   AUCUNE DEUXIEME TENTATIVE SANS RESOLUTION HUMAINE DE LA PREMIERE.
--
-- Additif et idempotent, comme les migrations qui precedent.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. La cle API, par marchand et par environnement
-- ─────────────────────────────────────────────────────────────────────────

-- La cle est par NCC, visible du seul gestionnaire principal, et le marchand
-- peut la faire tourner sans nous prevenir. On ne la stocke JAMAIS : on garde
-- une reference vers le coffre et une empreinte, pour pouvoir dire « la cle a
-- change » sans jamais l'ecrire.
CREATE TABLE IF NOT EXISTS core.fne_credential (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_party_id    uuid NOT NULL REFERENCES core.party(id),
  environment          text NOT NULL CHECK (environment IN ('test', 'prod')),
  ncc                  text NOT NULL,
  -- L'URL de production n'est pas dans la doc : la DGI la transmet par mail
  -- apres validation. Elle vit donc en base, versionnee par marchand.
  base_url             text NOT NULL,
  -- Reference vers le coffre. Jamais la valeur.
  api_key_ref          text NOT NULL,
  api_key_fingerprint  bytea NOT NULL,
  state                text NOT NULL DEFAULT 'pending'
                       CHECK (state IN ('pending', 'active', 'blocked', 'revoked')),
  blocked_reason       text,
  validated_at         timestamptz,
  last_success_at      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- Garde-fou dur : l'hote de test ne peut pas etre declare « prod ».
  CONSTRAINT fne_credential_env_url_ck
    CHECK (environment <> 'prod' OR position('54.247.95.108' in base_url) = 0)
);
-- Une seule cle vivante par marchand et par environnement.
CREATE UNIQUE INDEX IF NOT EXISTS fne_credential_live_unique
  ON core.fne_credential (merchant_party_id, environment) WHERE state <> 'revoked';

-- Toute vie de la cle laisse une trace : c'est ce qui permet d'expliquer un
-- gel de file au marchand, des mois plus tard.
CREATE TABLE IF NOT EXISTS core.fne_credential_event (
  id             bigserial PRIMARY KEY,
  credential_id  uuid NOT NULL REFERENCES core.fne_credential(id),
  from_state     text,
  to_state       text NOT NULL,
  reason         text,
  actor          text NOT NULL,
  detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
  at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fne_credential_event_idx
  ON core.fne_credential_event (credential_id, at DESC);

DROP TRIGGER IF EXISTS fne_credential_event_append_only ON core.fne_credential_event;
CREATE TRIGGER fne_credential_event_append_only
  BEFORE UPDATE OR DELETE ON core.fne_credential_event
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Ce qui manque a core.invoice
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE core.invoice
  -- Sans `fne_invoice_id` et les ids d'articles, plus JAMAIS d'avoir.
  ADD COLUMN IF NOT EXISTS fne_invoice_id     text,
  ADD COLUMN IF NOT EXISTS fne_parent_id      text,
  ADD COLUMN IF NOT EXISTS fne_environment    text CHECK (fne_environment IN ('test', 'prod')),
  -- Une facture de test ne part jamais en prod, et inversement. Voir §5.
  ADD COLUMN IF NOT EXISTS is_test_data       boolean NOT NULL DEFAULT false,
  -- Les totaux que la DGI a calcules elle-meme : notre seule sentinelle tant
  -- que la regle d'arrondi officielle est inconnue.
  ADD COLUMN IF NOT EXISTS dgi_total_ttc      bigint,
  ADD COLUMN IF NOT EXISTS dgi_total_vat      bigint,
  ADD COLUMN IF NOT EXISTS dgi_fiscal_stamp   bigint,
  -- `computeTotals` calcule un total de taxes specifiques que 037 ne stockait
  -- nulle part : le rapprochement etait impossible.
  ADD COLUMN IF NOT EXISTS total_custom       bigint NOT NULL DEFAULT 0,
  -- Une erreur sur un champ NON-article (NCC, template, code de TVA, point de
  -- vente) n'a aucun chemin de correction : avoir integral + reemission. Le
  -- lien est materialise ici, pas laisse a la memoire de quelqu'un.
  ADD COLUMN IF NOT EXISTS superseded_by      uuid REFERENCES core.invoice(id),
  ADD COLUMN IF NOT EXISTS superseded_reason  text,
  -- L'opposabilite : certifier ne suffit pas. Le document doit porter les
  -- TROIS elements (QR issu du token, visuel FNE, format de numerotation).
  ADD COLUMN IF NOT EXISTS doc_state          text NOT NULL DEFAULT 'none'
                                              CHECK (doc_state IN ('none', 'rendered', 'delivered')),
  ADD COLUMN IF NOT EXISTS rendered_at        timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at       timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_channel   text,
  -- L'entete tel qu'il est parti : un profil marchand qui change ne doit pas
  -- reecrire l'histoire d'une facture deja certifiee.
  ADD COLUMN IF NOT EXISTS point_of_sale      text,
  ADD COLUMN IF NOT EXISTS establishment      text,
  ADD COLUMN IF NOT EXISTS is_rne             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rne                text,
  ADD COLUMN IF NOT EXISTS discount_percent   integer CHECK (discount_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS foreign_currency   text,
  ADD COLUMN IF NOT EXISTS foreign_currency_rate numeric(18, 6),
  -- Une exoneration conventionnelle (TVAC) s'appuie sur un texte. Aucun champ
  -- de l'API ne le porte : on le garde au moins de notre cote.
  ADD COLUMN IF NOT EXISTS convention_ref     text,
  -- `warning` est booleen dans l'exemple, `string` dans le tableau. On garde le
  -- brut : lire « true » comme false ferait perdre l'alerte de stock.
  ADD COLUMN IF NOT EXISTS warning_raw        text,
  ADD COLUMN IF NOT EXISTS attempt_count      integer NOT NULL DEFAULT 0;

-- L'avoir est un DOCUMENT, pas un etat de la facture d'origine : il a sa propre
-- reference (prefixee A), son propre sticker, son propre cycle.
DO $$
BEGIN
  ALTER TABLE core.invoice DROP CONSTRAINT IF EXISTS invoice_invoice_type_check;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_invoice_type_ck') THEN
    ALTER TABLE core.invoice
      ADD CONSTRAINT invoice_invoice_type_ck
      CHECK (invoice_type IN ('sale', 'purchase', 'refund'));
  END IF;
END
$$;

-- L'INCERTITUDE devient representable. C'est le coeur de cette migration :
-- sans `uncertain`, un timeout laisse la facture en `submitted` pour toujours,
-- et la reprise produit soit un doublon officiel, soit une facture perdue.
DO $$
BEGIN
  ALTER TABLE core.invoice DROP CONSTRAINT IF EXISTS invoice_fne_status_check;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_fne_status_ck') THEN
    ALTER TABLE core.invoice
      ADD CONSTRAINT invoice_fne_status_ck
      CHECK (fne_status IN (
        'draft',            -- en composition
        'validated_local',  -- notre validateur est passe, numero local alloue
        'queued',           -- admise en file, verrou single-flight pris
        'submitted',        -- une tentative est COMMITEE : un POST a pu partir
        'accepted',         -- 200/201 avec reference ET token : irreversible
        'rejected',         -- 400 : la DGI dit qu'elle n'a rien fait
        'uncertain',        -- parti, pas de reponse : sortie HUMAINE seulement
        'unreachable',      -- jamais parti : seul rejeu automatique legitime
        'blocked',          -- 401 ou stock epuise : la file du marchand gele
        'abandoned'         -- ecartee ; un enregistrement, pas une suppression
      ));
  END IF;
END
$$;

-- Une facture certifiee porte reference ET token, ou elle n'est pas certifiee.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_accepted_shape_ck') THEN
    ALTER TABLE core.invoice
      ADD CONSTRAINT invoice_accepted_shape_ck
      CHECK (fne_status <> 'accepted'
             OR (fne_ref IS NOT NULL AND fne_token IS NOT NULL));
  END IF;
END
$$;

-- Un avoir pointe la facture d'origine ; une vente ou un bordereau, jamais.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_refund_shape_ck') THEN
    ALTER TABLE core.invoice
      ADD CONSTRAINT invoice_refund_shape_ck
      CHECK ((invoice_type = 'refund' AND refund_of_id IS NOT NULL)
             OR (invoice_type <> 'refund' AND refund_of_id IS NULL));
  END IF;
END
$$;

-- Le rendu ne precede pas la certification : sans QR ni numero officiel, il n'y
-- a rien a rendre.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_doc_state_ck') THEN
    ALTER TABLE core.invoice
      ADD CONSTRAINT invoice_doc_state_ck
      CHECK (doc_state = 'none' OR fne_status = 'accepted');
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS invoice_uncertain_idx
  ON core.invoice (merchant_party_id, created_at DESC)
  WHERE fne_status IN ('uncertain', 'blocked');
CREATE UNIQUE INDEX IF NOT EXISTS invoice_fne_invoice_id_unique
  ON core.invoice (fne_invoice_id) WHERE fne_invoice_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Les articles, et les ids que la DGI nous rend
-- ─────────────────────────────────────────────────────────────────────────

-- 037 gardait les lignes en jsonb. Un avoir a besoin, par ARTICLE, de l'id que
-- la DGI a attribue et de la quantite deja retournee : ce sont des lignes, pas
-- un document.
CREATE TABLE IF NOT EXISTS core.invoice_item (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid NOT NULL REFERENCES core.invoice(id),
  line_no           integer NOT NULL CHECK (line_no >= 1),
  -- Facultative pour la DGI, OBLIGATOIRE chez nous : c'est la seule facon
  -- deterministe de rattacher un id d'article DGI a notre ligne.
  reference         text NOT NULL,
  description       text NOT NULL,
  quantity          numeric(20, 3) NOT NULL CHECK (quantity > 0),
  unit_price_ht     bigint NOT NULL CHECK (unit_price_ht >= 0),
  tax_code          text CHECK (tax_code IN ('TVA', 'TVAB', 'TVAC', 'TVAD')),
  discount_percent  integer CHECK (discount_percent BETWEEN 0 AND 100),
  measurement_unit  text,
  -- Les taxes specifiques sont des TAUX (« Taux de L'autre taxe », p.8), pas
  -- des montants. Tant que leur base de calcul n'est pas confirmee par la DGI,
  -- l'emission est refusee en amont — la colonne existe pour le jour ou.
  custom_taxes      jsonb NOT NULL DEFAULT '[]'::jsonb,
  base_ht           bigint NOT NULL CHECK (base_ht >= 0),
  tva               bigint NOT NULL DEFAULT 0 CHECK (tva >= 0),
  custom_total      bigint NOT NULL DEFAULT 0 CHECK (custom_total >= 0),
  -- Rendu par la DGI a la certification. Sans lui, pas d'avoir sur cet article.
  dgi_item_id       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_item_line_unique
  ON core.invoice_item (invoice_id, line_no);
-- Une reference d'article ne peut pas etre ambigue DANS une facture : c'est ce
-- qui rend le rattachement des ids DGI deterministe.
CREATE UNIQUE INDEX IF NOT EXISTS invoice_item_reference_unique
  ON core.invoice_item (invoice_id, reference);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_item_dgi_id_unique
  ON core.invoice_item (dgi_item_id) WHERE dgi_item_id IS NOT NULL;

-- Un bordereau d'achat ne porte NI taxes NI taxes specifiques sur ses articles
-- (p.16 et p.18). Une TVA collee sur un achat de cacao au producteur serait une
-- TVA indue sur un document irrevocable : la base le refuse.
CREATE OR REPLACE FUNCTION core.invoice_item_shape() RETURNS trigger AS $shape$
DECLARE
  t text;
BEGIN
  SELECT invoice_type INTO t FROM core.invoice WHERE id = NEW.invoice_id;
  IF t = 'purchase' THEN
    IF NEW.tax_code IS NOT NULL OR jsonb_array_length(NEW.custom_taxes) > 0 THEN
      RAISE EXCEPTION 'bordereau d achat : un article ne porte ni taxes ni customTaxes';
    END IF;
  ELSIF t IN ('sale', 'refund') THEN
    IF NEW.tax_code IS NULL THEN
      RAISE EXCEPTION 'facture de vente : le code de TVA est obligatoire (ligne %)', NEW.line_no;
    END IF;
  END IF;
  RETURN NEW;
END;
$shape$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_item_shape_trg ON core.invoice_item;
CREATE TRIGGER invoice_item_shape_trg
  BEFORE INSERT OR UPDATE ON core.invoice_item
  FOR EACH ROW EXECUTE FUNCTION core.invoice_item_shape();

-- Un avoir porte sur des couples (article d'origine, quantite). Le cumul des
-- avoirs partiels ne peut pas depasser ce qui a ete vendu — la DGI ne dit pas
-- si elle le controle (question 20), donc nous, oui.
CREATE TABLE IF NOT EXISTS core.invoice_item_refund (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_invoice_id  uuid NOT NULL REFERENCES core.invoice(id),
  origin_item_id     uuid NOT NULL REFERENCES core.invoice_item(id),
  quantity           numeric(20, 3) NOT NULL CHECK (quantity > 0),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_item_refund_unique
  ON core.invoice_item_refund (refund_invoice_id, origin_item_id);
CREATE INDEX IF NOT EXISTS invoice_item_refund_origin_idx
  ON core.invoice_item_refund (origin_item_id);

CREATE OR REPLACE FUNCTION core.refund_quantity_cap() RETURNS trigger AS $cap$
DECLARE
  vendue  numeric(20, 3);
  cumulee numeric(20, 3);
BEGIN
  SELECT quantity INTO vendue FROM core.invoice_item WHERE id = NEW.origin_item_id;
  -- Un avoir EN DOUTE reserve son quota : tant qu'on ne sait pas s'il a ete
  -- certifie, on ne peut pas le rendre deux fois.
  SELECT COALESCE(SUM(r.quantity), 0) INTO cumulee
    FROM core.invoice_item_refund r
    JOIN core.invoice i ON i.id = r.refund_invoice_id
   WHERE r.origin_item_id = NEW.origin_item_id
     AND r.id <> NEW.id
     AND i.fne_status IN ('submitted', 'accepted', 'uncertain');
  IF cumulee + NEW.quantity > vendue THEN
    RAISE EXCEPTION 'avoir superieur a la quantite vendue (article %, vendue %, deja %, demande %)',
      NEW.origin_item_id, vendue, cumulee, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$cap$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refund_quantity_cap_trg ON core.invoice_item_refund;
CREATE TRIGGER refund_quantity_cap_trg
  BEFORE INSERT OR UPDATE ON core.invoice_item_refund
  FOR EACH ROW EXECUTE FUNCTION core.refund_quantity_cap();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. La tentative : la seule preuve qu'un POST a pu partir
-- ─────────────────────────────────────────────────────────────────────────

-- Ecrite et COMMITEE avant le premier octet. Sans elle, un crash entre l'envoi
-- et la reponse ne laisse aucune trace, et la reprise brule un second sticker
-- en creant une seconde facture officielle.
CREATE TABLE IF NOT EXISTS core.fne_attempt (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid NOT NULL REFERENCES core.invoice(id),
  attempt_no        integer NOT NULL CHECK (attempt_no >= 1),
  endpoint          text NOT NULL CHECK (endpoint IN ('sign', 'refund')),
  credential_id     uuid NOT NULL REFERENCES core.fne_credential(id),
  environment       text NOT NULL CHECK (environment IN ('test', 'prod')),
  base_url          text NOT NULL,
  -- L'empreinte du corps exact : elle prouve ce qui a ete envoye, meme des
  -- mois plus tard, et elle detecte un rejeu qui aurait mute le contenu.
  request_hash      bytea NOT NULL,
  request_body      jsonb NOT NULL,
  started_at        timestamptz NOT NULL DEFAULT now(),
  -- NULL tant que la tentative est ouverte. Une tentative ouverte est le signe
  -- qu'un processus est mort en vol : elle se clot a la main, en `uncertain`.
  outcome           text CHECK (outcome IN
                    ('accepted', 'rejected', 'uncertain', 'unreachable', 'blocked')),
  outcome_reason    text,
  http_status       integer,
  response_body     jsonb,
  external_event_id bigint REFERENCES core.external_event(id),
  finished_at       timestamptz,
  CONSTRAINT fne_attempt_closed_shape_ck
    CHECK ((finished_at IS NULL AND outcome IS NULL)
           OR (finished_at IS NOT NULL AND outcome IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS fne_attempt_no_unique
  ON core.fne_attempt (invoice_id, attempt_no);
-- Une seule tentative ouverte par facture : c'est le single-flight rendu
-- durable. `invoice_fne_ref_unique` ne protege rien avant la reponse, puisque
-- `fne_ref` est NULL tant qu'on n'a pas certifie.
CREATE UNIQUE INDEX IF NOT EXISTS fne_attempt_open_unique
  ON core.fne_attempt (invoice_id) WHERE finished_at IS NULL;
CREATE INDEX IF NOT EXISTS fne_attempt_open_idx
  ON core.fne_attempt (started_at) WHERE finished_at IS NULL;

-- L'invariant central, tenu par la base.
CREATE OR REPLACE FUNCTION core.fne_attempt_guard() RETURNS trigger AS $guard$
DECLARE
  inv        core.invoice%ROWTYPE;
  cred       core.fne_credential%ROWTYPE;
  precedente core.fne_attempt%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM core.invoice WHERE id = NEW.invoice_id FOR UPDATE;
  SELECT * INTO cred FROM core.fne_credential WHERE id = NEW.credential_id;

  -- 1. On ne renvoie jamais une facture deja certifiee.
  IF inv.fne_status = 'accepted' THEN
    RAISE EXCEPTION 'facture % deja certifiee (%) : un second envoi creerait un doublon officiel',
      inv.id, inv.fne_ref;
  END IF;

  -- 2. On n'envoie que depuis la file. Tout le reste est un bug d'appelant.
  IF inv.fne_status NOT IN ('queued') THEN
    RAISE EXCEPTION 'facture % en etat % : seul « queued » autorise un envoi', inv.id, inv.fne_status;
  END IF;

  -- 3. Aucune deuxieme tentative tant qu'un HUMAIN n'a pas clos la premiere.
  SELECT * INTO precedente FROM core.fne_attempt
   WHERE invoice_id = NEW.invoice_id AND attempt_no = NEW.attempt_no - 1;
  IF FOUND THEN
    IF precedente.finished_at IS NULL THEN
      RAISE EXCEPTION 'tentative % encore ouverte sur la facture %', precedente.attempt_no, inv.id;
    END IF;
    IF precedente.outcome = 'uncertain'
       AND NOT EXISTS (SELECT 1 FROM core.fne_resolution
                        WHERE attempt_id = precedente.id) THEN
      RAISE EXCEPTION 'facture % : la tentative % est en doute et non resolue — rejeu interdit',
        inv.id, precedente.attempt_no;
    END IF;
  END IF;

  -- 4. La cle doit etre vivante. Un 401 ne se rejoue pas.
  IF cred.state <> 'active' THEN
    RAISE EXCEPTION 'cle FNE % a l etat % : file gelee', cred.id, cred.state;
  END IF;
  IF cred.merchant_party_id <> inv.merchant_party_id THEN
    RAISE EXCEPTION 'cle FNE d un autre marchand';
  END IF;

  -- 5. Le garde-fou d'environnement. L'environnement de test est en HTTP CLAIR
  --    sur une IP brute : une vraie donnee ne doit JAMAIS y aller.
  IF NEW.environment <> cred.environment THEN
    RAISE EXCEPTION 'environnement % incompatible avec la cle (%)', NEW.environment, cred.environment;
  END IF;
  IF NEW.environment = 'test' AND NOT inv.is_test_data THEN
    RAISE EXCEPTION 'donnee de production vers l environnement de test : refus';
  END IF;
  IF NEW.environment = 'prod' AND inv.is_test_data THEN
    RAISE EXCEPTION 'donnee de test vers la production : refus';
  END IF;

  RETURN NEW;
END;
$guard$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fne_attempt_guard_trg ON core.fne_attempt;
CREATE TRIGGER fne_attempt_guard_trg
  BEFORE INSERT ON core.fne_attempt
  FOR EACH ROW EXECUTE FUNCTION core.fne_attempt_guard();

-- Une tentative se clot une fois. Elle ne se rouvre pas, elle ne se reecrit
-- pas, elle ne se supprime pas : c'est une piece a conviction.
CREATE OR REPLACE FUNCTION core.fne_attempt_seal() RETURNS trigger AS $seal$
BEGIN
  IF OLD.finished_at IS NOT NULL THEN
    RAISE EXCEPTION 'tentative % deja close : elle ne se modifie plus', OLD.id;
  END IF;
  IF NEW.invoice_id <> OLD.invoice_id
     OR NEW.attempt_no <> OLD.attempt_no
     OR NEW.request_hash <> OLD.request_hash
     OR NEW.request_body <> OLD.request_body
     OR NEW.base_url <> OLD.base_url
     OR NEW.environment <> OLD.environment
     OR NEW.started_at <> OLD.started_at THEN
    RAISE EXCEPTION 'le corps envoye et son horodatage sont immuables';
  END IF;
  RETURN NEW;
END;
$seal$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fne_attempt_seal_trg ON core.fne_attempt;
CREATE TRIGGER fne_attempt_seal_trg
  BEFORE UPDATE ON core.fne_attempt
  FOR EACH ROW EXECUTE FUNCTION core.fne_attempt_seal();

DROP TRIGGER IF EXISTS fne_attempt_no_delete ON core.fne_attempt;
CREATE TRIGGER fne_attempt_no_delete
  BEFORE DELETE ON core.fne_attempt
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Sortir du doute : la seule porte est humaine
-- ─────────────────────────────────────────────────────────────────────────

-- L'API n'expose aucun GET : ni statut, ni relecture par reference, ni liste.
-- Le token public ne sert a rien quand c'est precisement le token qu'on n'a pas
-- recu. Il n'y a donc pas de troisieme voie : l'oracle du solde ORIENTE,
-- l'humain TRANCHE, et sa decision s'ecrit ici.
CREATE TABLE IF NOT EXISTS core.fne_resolution (
  id             bigserial PRIMARY KEY,
  invoice_id     uuid NOT NULL REFERENCES core.invoice(id),
  attempt_id     uuid NOT NULL REFERENCES core.fne_attempt(id),
  decision       text NOT NULL CHECK (decision IN
                 ('found_certified', 'found_absent', 'duplicate_neutralized', 'abandoned')),
  -- Ce que l'humain a lu dans l'espace FNE. Sans ces valeurs, une facture
  -- retrouvee reste incorrigible faute d'ids d'articles.
  fne_ref        text,
  fne_token      text,
  fne_invoice_id text,
  item_ids       jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Un automate ne resout rien. Le nom d'une personne, ou rien.
  actor          text NOT NULL,
  notes          text,
  at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fne_resolution_found_shape_ck
    CHECK (decision <> 'found_certified' OR (fne_ref IS NOT NULL AND fne_token IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS fne_resolution_attempt_unique
  ON core.fne_resolution (attempt_id);
CREATE INDEX IF NOT EXISTS fne_resolution_invoice_idx
  ON core.fne_resolution (invoice_id, at DESC);

DROP TRIGGER IF EXISTS fne_resolution_append_only ON core.fne_resolution;
CREATE TRIGGER fne_resolution_append_only
  BEFORE UPDATE OR DELETE ON core.fne_resolution
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

-- ─────────────────────────────────────────────────────────────────────────
-- 6. La machine a etats, tenue par la base
-- ─────────────────────────────────────────────────────────────────────────

-- Depuis `submitted`, il n'existe que cinq sorties, et une seule est bonne.
-- Depuis `uncertain`, aucune sortie automatique. Depuis `accepted`, aucune
-- sortie du tout : le document existe chez la DGI, on ne le de-certifie pas.
CREATE OR REPLACE FUNCTION core.invoice_fne_status_fsm() RETURNS trigger AS $fsm$
DECLARE
  autorise constant jsonb := '{
    "draft":            ["validated_local", "abandoned"],
    "validated_local":  ["queued", "draft", "abandoned"],
    "queued":           ["submitted", "validated_local", "abandoned"],
    "submitted":        ["accepted", "rejected", "uncertain", "unreachable", "blocked"],
    "accepted":         [],
    "rejected":         ["validated_local", "abandoned"],
    "uncertain":        ["accepted", "validated_local", "abandoned"],
    "unreachable":      ["queued", "abandoned"],
    "blocked":          ["queued", "abandoned"],
    "abandoned":        []
  }'::jsonb;
BEGIN
  IF NEW.fne_status = OLD.fne_status THEN
    -- Ce qui est parti ne se reecrit pas : un rejeu ne doit jamais muter le
    -- contenu d'une facture dont un exemplaire est peut-etre chez la DGI.
    IF OLD.fne_status IN ('submitted', 'accepted', 'uncertain')
       AND (NEW.lines <> OLD.lines OR NEW.total_ttc <> OLD.total_ttc
            OR NEW.template <> OLD.template OR NEW.number_local <> OLD.number_local) THEN
      RAISE EXCEPTION 'facture % en % : son contenu est fige', OLD.id, OLD.fne_status;
    END IF;
    IF OLD.fne_ref IS NOT NULL AND NEW.fne_ref IS DISTINCT FROM OLD.fne_ref THEN
      RAISE EXCEPTION 'le numero officiel d une facture ne change jamais';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT (autorise -> OLD.fne_status ? NEW.fne_status) THEN
    RAISE EXCEPTION 'transition FNE interdite : % -> % (facture %)',
      OLD.fne_status, NEW.fne_status, OLD.id;
  END IF;

  -- On ne sort du doute que par une resolution humaine ECRITE.
  IF OLD.fne_status = 'uncertain'
     AND NOT EXISTS (SELECT 1 FROM core.fne_resolution WHERE invoice_id = OLD.id) THEN
    RAISE EXCEPTION 'facture % : sortie du doute sans resolution humaine', OLD.id;
  END IF;

  RETURN NEW;
END;
$fsm$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_fne_status_fsm_trg ON core.invoice;
CREATE TRIGGER invoice_fne_status_fsm_trg
  BEFORE UPDATE ON core.invoice
  FOR EACH ROW EXECUTE FUNCTION core.invoice_fne_status_fsm();

-- Le verrou single-flight, cote base : deux workers ne postent jamais la meme
-- facture. Rend faux si le verrou est deja pris — l'appelant abandonne, il ne
-- boucle pas.
CREATE OR REPLACE FUNCTION core.fne_single_flight(p_invoice_id uuid) RETURNS boolean AS $sf$
BEGIN
  RETURN pg_try_advisory_xact_lock(hashtextextended('fne:' || p_invoice_id::text, 0));
END;
$sf$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Le stock de stickers : un journal, pas un instantane
-- ─────────────────────────────────────────────────────────────────────────

-- `core.sticker_balance` (037) ecrase la valeur precedente : impossible d'y
-- voir une baisse inexpliquee. Or c'est le SEUL oracle lisible par machine
-- apres un doute. On journalise, et on garde la table de 037 comme cache.
CREATE TABLE IF NOT EXISTS core.sticker_observation (
  id                 bigserial PRIMARY KEY,
  merchant_party_id  uuid NOT NULL REFERENCES core.party(id),
  balance            integer NOT NULL,
  -- Le brut : booleen dans l'exemple, `string` dans le tableau des parametres.
  warning_raw        text,
  source             text NOT NULL CHECK (source IN ('sign', 'refund', 'manual')),
  attempt_id         uuid REFERENCES core.fne_attempt(id),
  invoice_id         uuid REFERENCES core.invoice(id),
  -- Ce que NOS succes expliquent, et ce qu'ils n'expliquent pas. Une baisse
  -- inexpliquee n'est PAS une preuve (le marchand peut facturer depuis
  -- l'espace web ou l'appli mobile) : elle ouvre une exception, jamais un rejeu.
  expected_drop      integer,
  unexplained_drop   integer,
  observed_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sticker_observation_idx
  ON core.sticker_observation (merchant_party_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS sticker_observation_anomaly_idx
  ON core.sticker_observation (merchant_party_id, observed_at DESC)
  WHERE unexplained_drop IS NOT NULL AND unexplained_drop > 0;

DROP TRIGGER IF EXISTS sticker_observation_append_only ON core.sticker_observation;
CREATE TRIGGER sticker_observation_append_only
  BEFORE UPDATE OR DELETE ON core.sticker_observation
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

CREATE OR REPLACE VIEW core.sticker_latest AS
SELECT DISTINCT ON (merchant_party_id)
       merchant_party_id, balance, warning_raw, observed_at
  FROM core.sticker_observation
 ORDER BY merchant_party_id, observed_at DESC;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. L'archivage des preuves
-- ─────────────────────────────────────────────────────────────────────────

-- Une facture certifiee n'est opposable que rendue avec les TROIS elements :
-- QR issu du token, visuel FNE, format de numerotation. On archive ce qui a ete
-- envoye, ce qui a ete recu, et ce qui a ete remis au client — avec l'empreinte
-- qui permet de prouver, des annees plus tard, que c'est bien ce document-la.
CREATE TABLE IF NOT EXISTS core.fne_proof (
  id           bigserial PRIMARY KEY,
  invoice_id   uuid NOT NULL REFERENCES core.invoice(id),
  attempt_id   uuid REFERENCES core.fne_attempt(id),
  kind         text NOT NULL CHECK (kind IN
               ('request_body', 'response_body', 'qr_png', 'document_pdf', 'delivery_receipt')),
  sha256       bytea NOT NULL,
  content_type text,
  storage_ref  text NOT NULL,
  byte_size    bigint CHECK (byte_size >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fne_proof_invoice_idx ON core.fne_proof (invoice_id, kind, created_at DESC);

DROP TRIGGER IF EXISTS fne_proof_append_only ON core.fne_proof;
CREATE TRIGGER fne_proof_append_only
  BEFORE UPDATE OR DELETE ON core.fne_proof
  FOR EACH ROW EXECUTE FUNCTION core.refuse_mutation();

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Ce qui ne se tranche pas tout seul
-- ─────────────────────────────────────────────────────────────────────────

-- 037 avait prevu `dgi_uncertain` mais rien n'ecrivait dedans, et il manquait
-- les quatre cas qui remontent vraiment du terrain.
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
      'reserve_residual',
      'dgi_totals_mismatch',
      'dgi_sticker_anomaly',
      'dgi_key_blocked',
      'dgi_item_mapping',
      'dgi_duplicate_suspect'
    ));
END
$exc$;
