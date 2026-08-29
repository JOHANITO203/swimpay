-- Verification des invariants du schema « core ».
--
-- Ce fichier n'est pas une migration : il s'execute contre une base fraiche
-- ou 037 vient d'etre appliquee, et il ECHOUE si une garantie ne tient pas.
-- Chaque bloc verifie une promesse que le Cerveau fait au marchand.
--
--   psql -v ON_ERROR_STOP=1 -f 037_core_schema.sql
--   psql -v ON_ERROR_STOP=1 -f 037_core_schema.verify.sql

\set ON_ERROR_STOP on

BEGIN;

-- Deux marchands et une vente pour travailler.
INSERT INTO core.party (id, kind, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'business', 'Boulangerie du Pont'),
  ('22222222-2222-2222-2222-222222222222', 'person',   'Issa D.');

INSERT INTO core.sale (id, merchant_party_id, amount_minor, channel, reference)
VALUES ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111', 50000, 'qr_dyn', 'VTE-1');

-- ─── 1. L'idempotence empeche le double versement ────────────────────────
INSERT INTO core.payment_intent
  (merchant_party_id, rail, amount_minor, idempotency_key)
VALUES ('11111111-1111-1111-1111-111111111111', 'sim', 50000, 'cle-unique');

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.payment_intent
      (merchant_party_id, rail, amount_minor, idempotency_key)
    VALUES ('11111111-1111-1111-1111-111111111111', 'sim', 50000, 'cle-unique');
    RAISE EXCEPTION 'ECHEC : deux intents ont partage la meme cle d idempotence';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1 — la cle d idempotence est unique';
  END;
END
$verif$;

-- ─── 2. Une vente n'est rapprochee qu'une fois ───────────────────────────
INSERT INTO core.match (sale_id, score, method)
VALUES ('33333333-3333-3333-3333-333333333333', 100, 'auto_ref');

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.match (sale_id, score, method)
    VALUES ('33333333-3333-3333-3333-333333333333', 95, 'auto_heur');
    RAISE EXCEPTION 'ECHEC : une vente a ete rapprochee deux fois';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 2 — une vente ne se rapproche qu une fois';
  END;
END
$verif$;

-- ─── 3. Deux ventes du meme marchand ne portent pas la meme reference ────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.sale (merchant_party_id, amount_minor, channel, reference)
    VALUES ('11111111-1111-1111-1111-111111111111', 9000, 'link', 'VTE-1');
    RAISE EXCEPTION 'ECHEC : deux ventes partagent la reference VTE-1';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 3 — la reference est unique chez le marchand';
  END;
END
$verif$;

-- ... mais deux marchands differents peuvent, eux, utiliser la meme.
INSERT INTO core.party (id, kind, display_name)
VALUES ('44444444-4444-4444-4444-444444444444', 'business', 'Kiosque 12');
INSERT INTO core.sale (merchant_party_id, amount_minor, channel, reference)
VALUES ('44444444-4444-4444-4444-444444444444', 1000, 'qr_dyn', 'VTE-1');
DO $verif$ BEGIN RAISE NOTICE 'OK 4 — deux marchands peuvent porter la meme reference'; END $verif$;

-- ─── 5. Un identifiant ACTIF appartient a un seul party ──────────────────
INSERT INTO core.identifier (party_id, kind, value_normalized, value_hash)
VALUES ('22222222-2222-2222-2222-222222222222', 'msisdn', '+2250707123456', '\x00');

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.identifier (party_id, kind, value_normalized, value_hash)
    VALUES ('11111111-1111-1111-1111-111111111111', 'msisdn', '+2250707123456', '\x01');
    RAISE EXCEPTION 'ECHEC : deux party revendiquent le meme numero actif';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 5 — un numero actif n a qu un proprietaire';
  END;
END
$verif$;

-- L'historique, lui, reste : un lien desactive ne bloque pas le suivant.
UPDATE core.identifier SET active = false WHERE value_normalized = '+2250707123456';
INSERT INTO core.identifier (party_id, kind, value_normalized, value_hash)
VALUES ('11111111-1111-1111-1111-111111111111', 'msisdn', '+2250707123456', '\x01');
DO $verif$ BEGIN RAISE NOTICE 'OK 6 — le numero se transfere, l historique demeure'; END $verif$;

-- ─── 7. Un evenement fournisseur ne se traite qu une fois ────────────────
INSERT INTO core.external_event (source, kind, raw, dedupe_key)
VALUES ('sim', 'payin.succeeded', '{}'::jsonb, 'sim:ref-1:succeeded');

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.external_event (source, kind, raw, dedupe_key)
    VALUES ('sim', 'payin.succeeded', '{}'::jsonb, 'sim:ref-1:succeeded');
    RAISE EXCEPTION 'ECHEC : le meme webhook a ete enregistre deux fois';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 7 — un webhook rejoue ne compte qu une fois';
  END;
END
$verif$;

-- ─── 8. Le journal d audit n accepte ni correction ni effacement ─────────
INSERT INTO core.audit_event (actor, action, entity_ref)
VALUES ('systeme', 'sale.created', 'sale:33333333-3333-3333-3333-333333333333');

DO $verif$
BEGIN
  BEGIN
    UPDATE core.audit_event SET action = 'sale.modified' WHERE actor = 'systeme';
    RAISE EXCEPTION 'ECHEC : le journal d audit a ete modifie';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%append-only%' THEN
      RAISE NOTICE 'OK 8 — le journal refuse la modification';
    ELSE
      RAISE;
    END IF;
  END;
END
$verif$;

DO $verif$
BEGIN
  BEGIN
    DELETE FROM core.audit_event WHERE actor = 'systeme';
    RAISE EXCEPTION 'ECHEC : une ligne du journal a ete supprimee';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%append-only%' THEN
      RAISE NOTICE 'OK 9 — le journal refuse la suppression';
    ELSE
      RAISE;
    END IF;
  END;
END
$verif$;

DO $verif$
BEGIN
  BEGIN
    DELETE FROM core.external_event WHERE dedupe_key = 'sim:ref-1:succeeded';
    RAISE EXCEPTION 'ECHEC : un payload fournisseur a ete supprime';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%append-only%' THEN
      RAISE NOTICE 'OK 10 — le brut fournisseur ne se supprime pas';
    ELSE
      RAISE;
    END IF;
  END;
END
$verif$;

-- ─── 11. L argent ne prend pas de valeur absurde ─────────────────────────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.sale (merchant_party_id, amount_minor, channel)
    VALUES ('11111111-1111-1111-1111-111111111111', 0, 'manual_cash');
    RAISE EXCEPTION 'ECHEC : une vente de montant nul a ete acceptee';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 11 — une vente de montant nul est refusee';
  END;
END
$verif$;

-- ─── 12. Les plafonds sont la, et ils dorment ────────────────────────────
DO $verif$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM core.limits WHERE enforced;
  IF n <> 0 THEN
    RAISE EXCEPTION 'ECHEC : % plafond(s) applique(s) alors qu on est en pass-through', n;
  END IF;
  SELECT count(*) INTO n FROM core.limits;
  IF n <> 3 THEN
    RAISE EXCEPTION 'ECHEC : % plafonds au lieu de 3', n;
  END IF;
  RAISE NOTICE 'OK 12 — les trois plafonds sont codes et dormants';
END
$verif$;

ROLLBACK;

\echo 'Les douze invariants du schema core tiennent.'
