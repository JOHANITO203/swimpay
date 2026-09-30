-- Verification des invariants de l'operation, du brin et du lot.
--
-- Ce fichier n'est pas une migration : il s'execute contre une base ou 037,
-- 038 et 039 viennent d'etre appliquees, et il ECHOUE si une garantie ne
-- tient pas. Chaque bloc empeche un accident nomme.
--
--   psql -v ON_ERROR_STOP=1 -f 037_core_schema.sql
--   psql -v ON_ERROR_STOP=1 -f 038_recipients_and_instructions.sql
--   psql -v ON_ERROR_STOP=1 -f 039_operation_atomique_et_lots.sql
--   psql -v ON_ERROR_STOP=1 -f 039_operation_atomique_et_lots.verify.sql

\set ON_ERROR_STOP on

BEGIN;

-- ─── Le decor ───────────────────────────────────────────────────────────
INSERT INTO core.party (id, kind, display_name) VALUES
  ('cccccccc-0000-0000-0000-00000000000a', 'business', 'PME du Plateau'),
  ('cccccccc-0000-0000-0000-00000000000b', 'person',   'Employe A'),
  ('cccccccc-0000-0000-0000-00000000000c', 'person',   'Employe B');

INSERT INTO core.recipient (id, owner_party_id, party_id, display_name, stage,
                            destination_value, destination_hash, preferred_rail)
VALUES
  ('dddddddd-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a',
   'cccccccc-0000-0000-0000-00000000000b', 'Employe A', 'active', NULL, '\x0a', NULL),
  ('dddddddd-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000a',
   NULL, 'Employe B', 'saved', '+2250707000002', '\x0b', 'sim');

-- ─── 1. Tant que l'arbitrage n'est pas rendu, aucune position ───────────
--     Accident evite : livrer une UI de custody (solde, coffre, plafonds) sur
--     un schema de pass-through, c'est-a-dire promettre ce que 07_SPEC
--     interdit et que le partenaire n'a peut-etre pas autorise.
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.envelope (party_id, purpose)
    VALUES ('cccccccc-0000-0000-0000-00000000000a', 'business_treasury');
    RAISE EXCEPTION 'ECHEC : une enveloppe est nee alors que l arbitrage n est pas rendu';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%money_model%' THEN
      RAISE NOTICE 'OK 1 — pas de position par client tant que LO n a pas tranche';
    ELSE RAISE; END IF;
  END;
END
$verif$;

UPDATE core.money_model
   SET mode = 'custody', decided_by = 'verify.sql', decided_at = now(),
       note = 'bascule de test — l arbitrage reel appartient a LO';

INSERT INTO core.envelope (id, party_id, purpose) VALUES
  ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a', 'business_treasury'),
  ('eeeeeeee-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b', 'user');

INSERT INTO core.external_event (id, source, kind, raw, dedupe_key) VALUES
  (900001, 'sim', 'payin.succeeded',  '{"ref":"in-1"}'::jsonb,  'sim:in-1'),
  (900002, 'sim', 'payout.succeeded', '{"ref":"out-1"}'::jsonb, 'sim:out-1');

-- Le rechargement : rail -> enveloppe. C'est l'entree, ou l'incertitude est
-- en AMONT : on apprend, puis on ecrit.
INSERT INTO core.operation (id, kind, shape, origin_party_id, amount_minor, rail,
                            request_fingerprint, status)
VALUES ('f0000000-0000-0000-0000-000000000001', 'topup', 'inbound',
        'cccccccc-0000-0000-0000-00000000000a', 1000000, 'sim', md5('t')||md5('u'), 'draft');
UPDATE core.operation SET quoted_rail_fee_minor = 0, quoted_service_fee_minor = 0,
       quoted_delay = 'immediat', quoted_at = now(), status = 'sealed'
 WHERE id = 'f0000000-0000-0000-0000-000000000001';

INSERT INTO core.movement (id, operation_id, leg, amount_minor,
                           origin_kind, destination_kind, destination_envelope_id,
                           rail, rail_ref, status)
VALUES ('a0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
        'principal', 1000000, 'rail', 'envelope', 'eeeeeeee-0000-0000-0000-00000000000a',
        'sim', 'in-1', 'sealed');
UPDATE core.movement SET status = 'submitted' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE core.movement SET status = 'settled', proof_event_id = 900001
 WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE core.operation SET status = 'settled' WHERE id = 'f0000000-0000-0000-0000-000000000001';

DO $verif$
DECLARE s bigint;
BEGIN
  SELECT balance_minor INTO s FROM core.envelope WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a';
  IF s <> 1000000 THEN RAISE EXCEPTION 'ECHEC : la position vaut % au lieu de 1000000', s; END IF;
  RAISE NOTICE 'OK 2 — un brin regle deplace la position, et lui seul';
END
$verif$;

-- ─── 3. Le solde ne s'ecrit pas a la main ───────────────────────────────
--     Accident evite : une correction ops ou un bug applicatif qui CREE de
--     l'argent en posant un chiffre dans une colonne.
DO $verif$
BEGIN
  BEGIN
    UPDATE core.envelope SET balance_minor = 99999999
     WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a';
    RAISE EXCEPTION 'ECHEC : un solde a ete pose a la main';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%ne s ecrit pas%' THEN
      RAISE NOTICE 'OK 3 — le solde se derive des brins, il ne s ecrit pas';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 4. Une position ne passe jamais negative ───────────────────────────
--     Accident evite : le decouvert silencieux du prototype
--     (pmeCta : tresoPME = Math.max(0, tresoPME - total)), qui paie avec de
--     l'argent qui n'est pas la.
INSERT INTO core.operation (id, kind, shape, origin_party_id, amount_minor,
                            request_fingerprint, status)
VALUES ('f0000000-0000-0000-0000-000000000002', 'transfer', 'internal',
        'cccccccc-0000-0000-0000-00000000000b', 5000000, md5('x')||md5('y'), 'draft');
UPDATE core.operation SET quoted_rail_fee_minor = 0, quoted_service_fee_minor = 0,
       quoted_at = now(), status = 'sealed' WHERE id = 'f0000000-0000-0000-0000-000000000002';

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.movement (operation_id, leg, amount_minor,
                               origin_kind, origin_envelope_id,
                               destination_kind, destination_envelope_id, status)
    VALUES ('f0000000-0000-0000-0000-000000000002', 'principal', 5000000,
            'envelope', 'eeeeeeee-0000-0000-0000-00000000000b',
            'envelope', 'eeeeeeee-0000-0000-0000-00000000000a', 'settled');
    RAISE EXCEPTION 'ECHEC : une position est passee negative';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 4 — une position ne passe pas negative, meme en un clic';
  END;
END
$verif$;

-- ─── 5. Deux operations de meme contenu ne font qu'une ──────────────────
--     Accident evite : le double-clic, et surtout la reprise apres coupure.
--     La cle n'est pas fournie par l'appelant : elle est GENERATED, donc le
--     sessionNonce de instruction.ts:196 ne peut plus s'y glisser.
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.operation (kind, shape, origin_party_id, amount_minor,
                                request_fingerprint)
    VALUES ('transfer', 'internal', 'cccccccc-0000-0000-0000-00000000000b',
            5000000, md5('x')||md5('y'));
    RAISE EXCEPTION 'ECHEC : deux operations de meme contenu ont coexiste';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 5 — deux fois le meme geste ne font qu une operation';
  END;
END
$verif$;

-- ─── 6. La cle du lot est derivee PAR LA BASE ───────────────────────────
--     Accident evite : une reprise qui fabrique une empreinte neuve et paie
--     une seconde fois le meme employe.
INSERT INTO core.batch (id, owner_party_id, kind, label, approvals_required)
VALUES ('bbbb0000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-00000000000a',
        'payroll', 'Paie aout', 1);

DO $verif$
DECLARE emp text;
BEGIN
  INSERT INTO core.operation (id, kind, shape, origin_party_id, recipient_id, amount_minor,
                              batch_id, batch_seq, request_fingerprint, status)
  VALUES ('f0000000-0000-0000-0000-0000000000ff', 'transfer', 'internal',
          'cccccccc-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-00000000000a',
          30000, 'bbbb0000-0000-0000-0000-000000000001', 99,
          md5('nonce-de-session')||md5('bidon'), 'draft');
  SELECT request_fingerprint INTO emp FROM core.operation
   WHERE id = 'f0000000-0000-0000-0000-0000000000ff';
  IF emp = md5('nonce-de-session')||md5('bidon') THEN
    RAISE EXCEPTION 'ECHEC : l appelant a impose son empreinte sur une ligne de lot';
  END IF;
  IF emp <> core.cle('bbbb0000-0000-0000-0000-000000000001|99|dddddddd-0000-0000-0000-00000000000a|30000')
    THEN RAISE EXCEPTION 'ECHEC : l empreinte de lot n est pas derivee du contenu'; END IF;
  RAISE NOTICE 'OK 6 — l empreinte d une ligne de lot est derivee par la base';
END
$verif$;

-- ─── 7. Un reglement externe sans preuve est refuse ─────────────────────
--     Accident evite : marquer « paye » sur expiration d'un delai, alors que
--     le rail n'a jamais rien confirme.
INSERT INTO core.operation (id, kind, shape, origin_party_id, recipient_id, amount_minor, rail,
                            operator, destination_value, destination_hash,
                            request_fingerprint, status)
VALUES ('f0000000-0000-0000-0000-000000000003', 'payout', 'outbound',
        'cccccccc-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-00000000000b',
        100000, 'sim', 'orange-money-ci', '+2250707000002', '\x0b',
        md5('p')||md5('1'), 'draft');
UPDATE core.operation SET quoted_rail_fee_minor = 1000, quoted_service_fee_minor = 200,
       quoted_delay = 'immediat', quoted_at = now(), status = 'sealed'
 WHERE id = 'f0000000-0000-0000-0000-000000000003';

-- brin 1 : le financement. Interne, certain, immediat.
INSERT INTO core.movement (id, operation_id, leg, amount_minor,
                           origin_kind, origin_envelope_id,
                           destination_kind, destination_internal_code, status)
VALUES ('a0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000003',
        'funding', 100000, 'envelope', 'eeeeeeee-0000-0000-0000-00000000000a',
        'internal', 'SUSPENSE_IN_TRANSIT', 'settled');
-- brin 2 : le versement. Externe, incertain.
INSERT INTO core.movement (id, operation_id, leg, amount_minor,
                           origin_kind, origin_internal_code,
                           destination_kind, rail, operator, counterparty_value,
                           counterparty_hash, funded_by_movement_id, status)
VALUES ('a0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000003',
        'principal', 100000, 'internal', 'SUSPENSE_IN_TRANSIT',
        'rail', 'sim', 'orange-money-ci', '+2250707000002', '\x0b',
        'a0000000-0000-0000-0000-000000000010', 'sealed');
UPDATE core.movement SET status = 'submitted', rail_ref = 'out-1'
 WHERE id = 'a0000000-0000-0000-0000-000000000011';

DO $verif$
BEGIN
  BEGIN
    UPDATE core.movement SET status = 'settled'
     WHERE id = 'a0000000-0000-0000-0000-000000000011';
    RAISE EXCEPTION 'ECHEC : un versement a ete declare regle sans preuve';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%preuve fournisseur%' THEN
      RAISE NOTICE 'OK 7 — pas de reglement externe sans preuve du fournisseur';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 8. Un brin incertain ne se rejoue JAMAIS ───────────────────────────
--     Accident evite : le double payout. C'est la regle deja ecrite pour la
--     DGI (07_SPEC §3, single-flight) et qui manquait du cote de l'argent.
UPDATE core.movement SET status = 'unknown', reason_code = 'timeout_rail'
 WHERE id = 'a0000000-0000-0000-0000-000000000011';

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.movement (operation_id, leg, seq, amount_minor,
                               origin_kind, origin_internal_code,
                               destination_kind, rail, counterparty_hash, status)
    VALUES ('f0000000-0000-0000-0000-000000000003', 'principal', 2, 100000,
            'internal', 'SUSPENSE_IN_TRANSIT', 'rail', 'sim', '\x0b', 'sealed');
    RAISE EXCEPTION 'ECHEC : un versement incertain a ete rejoue';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%on ne rejoue pas%' THEN
      RAISE NOTICE 'OK 8 — sur un brin incertain, on interroge le rail, on ne rejoue pas';
    ELSE RAISE; END IF;
  END;
END
$verif$;

DO $verif$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM core.exception_queue
   WHERE kind = 'movement_unknown' AND status = 'open';
  IF n <> 1 THEN RAISE EXCEPTION 'ECHEC : l incertitude n est pas tombee en file (% ligne(s))', n; END IF;
  RAISE NOTICE 'OK 9 — l incertitude tombe en file d exception toute seule';
END
$verif$;

-- ─── 10. On sort de l'incertitude par une reponse, pas par une decision ─
DO $verif$
BEGIN
  BEGIN
    UPDATE core.movement SET status = 'refused'
     WHERE id = 'a0000000-0000-0000-0000-000000000011';
    RAISE EXCEPTION 'ECHEC : une incertitude a ete tranchee sans reponse ni arbitrage';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%getStatus%' THEN
      RAISE NOTICE 'OK 10 — on sort de « unknown » par getStatus ou par un arbitrage trace';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 11. Le retour est un NOUVEAU brin ; rien ne s'annule ───────────────
--     Accident evite : de l'argent gele en suspens apres un refus de rail,
--     invisible au client et introuvable au recomptage.
UPDATE core.movement
   SET status = 'refused', reason_code = 'numero_invalide',
       resolution_ref = 'getStatus:sim:out-1'
 WHERE id = 'a0000000-0000-0000-0000-000000000011';

DO $verif$
DECLARE retour bigint; suspens bigint; treso bigint;
BEGIN
  SELECT count(*) INTO retour FROM core.movement
   WHERE operation_id = 'f0000000-0000-0000-0000-000000000003' AND leg = 'return'
     AND status = 'settled';
  IF retour <> 1 THEN RAISE EXCEPTION 'ECHEC : aucun brin de retour apres refus'; END IF;
  SELECT balance_minor INTO suspens FROM core.internal_account WHERE code = 'SUSPENSE_IN_TRANSIT';
  IF suspens <> 0 THEN RAISE EXCEPTION 'ECHEC : % restent en suspens apres retour', suspens; END IF;
  SELECT balance_minor INTO treso FROM core.envelope
   WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a';
  IF treso <> 1000000 THEN
    RAISE EXCEPTION 'ECHEC : la tresorerie vaut % apres retour au lieu de 1000000', treso;
  END IF;
  RAISE NOTICE 'OK 11 — un refus rend l argent par un brin, jamais par une annulation';
END
$verif$;

-- ─── 12. Un brin termine ne se corrige pas, et rien ne se supprime ──────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.movement SET amount_minor = 1
     WHERE id = 'a0000000-0000-0000-0000-000000000010';
    RAISE EXCEPTION 'ECHEC : le montant d un brin regle a ete reecrit';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%geles au scellement%' OR SQLERRM LIKE '%se compense%' THEN
      RAISE NOTICE 'OK 12 — un brin termine se compense, il ne se corrige pas';
    ELSE RAISE; END IF;
  END;
  BEGIN
    DELETE FROM core.movement WHERE id = 'a0000000-0000-0000-0000-000000000010';
    RAISE EXCEPTION 'ECHEC : un brin a ete supprime';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%ne se supprime pas%' THEN
      RAISE NOTICE 'OK 13 — un brin ne se supprime pas';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 14. Un lot ne s'execute pas sans l'approbation de l'instantane EXACT
--     Accident evite : approuver cinq salaires filtres sur « Production » et
--     en payer trente parce que le filtre a change entre-temps
--     (prototype : visiblesEq / filtreEq lus au moment du clic).
INSERT INTO core.batch_line (batch_id, seq, recipient_id, amount_minor, route_kind, status)
VALUES ('bbbb0000-0000-0000-0000-000000000001', 1, 'dddddddd-0000-0000-0000-00000000000a',
        30000, 'internal', 'ready'),
       ('bbbb0000-0000-0000-0000-000000000001', 2, 'dddddddd-0000-0000-0000-00000000000b',
        20000, 'external', 'ready');
UPDATE core.batch SET status = 'sealed' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
UPDATE core.batch SET status = 'approved' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';

DO $verif$
BEGIN
  BEGIN
    UPDATE core.batch SET status = 'executing' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : un lot est parti sans approbation';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%approbation%' THEN
      RAISE NOTICE 'OK 14 — un lot ne part pas sans approbation';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- Une approbation qui porte sur un AUTRE instantane ne vaut rien.
INSERT INTO core.batch_approval (batch_id, snapshot_hash, approver, method)
VALUES ('bbbb0000-0000-0000-0000-000000000001', core.cle('un-autre-perimetre'),
        'gerant', 'pin');

DO $verif$
BEGIN
  BEGIN
    UPDATE core.batch SET status = 'executing' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : une approbation perimee a laisse partir le lot';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%approbation%' THEN
      RAISE NOTICE 'OK 15 — une approbation ne vaut que pour l instantane qu elle a vu';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 16. Le perimetre d'un lot scelle est gele ──────────────────────────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.batch_line (batch_id, seq, recipient_id, amount_minor)
    VALUES ('bbbb0000-0000-0000-0000-000000000001', 3,
            'dddddddd-0000-0000-0000-00000000000a', 10000);
    RAISE EXCEPTION 'ECHEC : une ligne a ete ajoutee a un lot scelle';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%gele%' THEN
      RAISE NOTICE 'OK 16 — le perimetre d un lot scelle ne bouge plus';
    ELSE RAISE; END IF;
  WHEN unique_violation THEN
    RAISE NOTICE 'OK 16 — un beneficiaire n apparait qu une fois par lot';
  END;
  BEGIN
    UPDATE core.batch_line SET amount_minor = 999999
     WHERE batch_id = 'bbbb0000-0000-0000-0000-000000000001' AND seq = 1;
    RAISE EXCEPTION 'ECHEC : un montant approuve a ete modifie';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%approuve ne change pas%' THEN
      RAISE NOTICE 'OK 17 — ce qui a ete approuve ne change pas';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 18. Un lot ne part pas a decouvert ─────────────────────────────────
INSERT INTO core.batch_approval (batch_id, snapshot_hash, approver, method)
SELECT id, snapshot_hash, 'gerant', 'pin' FROM core.batch
 WHERE id = 'bbbb0000-0000-0000-0000-000000000001';

DO $verif$
BEGIN
  BEGIN
    UPDATE core.batch SET status = 'executing' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : un lot est parti sans reserve';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%reserve%' THEN
      RAISE NOTICE 'OK 18 — pas d execution sans provision';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- La reserve : c'est une enveloppe, donc elle ne peut pas passer negative.
INSERT INTO core.envelope (id, batch_id, purpose)
VALUES ('eeeeeeee-0000-0000-0000-0000000000ba', 'bbbb0000-0000-0000-0000-000000000001',
        'batch_reserve');

-- Phase 1 : le provisionnement. Un debit unique, atomique, vers la reserve.
INSERT INTO core.operation (id, kind, shape, origin_party_id, amount_minor,
                            batch_id, batch_seq, request_fingerprint, status)
VALUES ('f0000000-0000-0000-0000-0000000000b0', 'transfer', 'internal',
        'cccccccc-0000-0000-0000-00000000000a', 20000,
        'bbbb0000-0000-0000-0000-000000000001', 0, md5('z')||md5('z'), 'draft');
UPDATE core.operation SET quoted_rail_fee_minor = 0, quoted_service_fee_minor = 0,
       quoted_at = now(), status = 'sealed' WHERE id = 'f0000000-0000-0000-0000-0000000000b0';
UPDATE core.operation SET status = 'settled' WHERE id = 'f0000000-0000-0000-0000-0000000000b0';
INSERT INTO core.movement (operation_id, leg, amount_minor,
                           origin_kind, origin_envelope_id,
                           destination_kind, destination_envelope_id, status)
VALUES ('f0000000-0000-0000-0000-0000000000b0', 'principal', 20000,
        'envelope', 'eeeeeeee-0000-0000-0000-00000000000a',
        'envelope', 'eeeeeeee-0000-0000-0000-0000000000ba', 'settled');

DO $verif$
BEGIN
  BEGIN
    UPDATE core.batch SET status = 'executing' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : un lot de 50000 est parti avec 20000 en reserve';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%decouvert%' THEN
      RAISE NOTICE 'OK 19 — un lot ne part pas a decouvert';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- On complete la reserve, et le lot part.
INSERT INTO core.operation (id, kind, shape, origin_party_id, amount_minor,
                            batch_id, batch_seq, request_fingerprint, status)
VALUES ('f0000000-0000-0000-0000-0000000000b1', 'transfer', 'internal',
        'cccccccc-0000-0000-0000-00000000000a', 30000,
        'bbbb0000-0000-0000-0000-000000000001', -1, md5('z')||md5('w'), 'draft');
UPDATE core.operation SET quoted_rail_fee_minor = 0, quoted_service_fee_minor = 0,
       quoted_at = now(), status = 'sealed' WHERE id = 'f0000000-0000-0000-0000-0000000000b1';
UPDATE core.operation SET status = 'settled' WHERE id = 'f0000000-0000-0000-0000-0000000000b1';
INSERT INTO core.movement (operation_id, leg, amount_minor,
                           origin_kind, origin_envelope_id,
                           destination_kind, destination_envelope_id, status)
VALUES ('f0000000-0000-0000-0000-0000000000b1', 'principal', 30000,
        'envelope', 'eeeeeeee-0000-0000-0000-00000000000a',
        'envelope', 'eeeeeeee-0000-0000-0000-0000000000ba', 'settled');

UPDATE core.batch SET status = 'funded', funded_at = now()
 WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
UPDATE core.batch SET status = 'executing' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
DO $verif$ BEGIN RAISE NOTICE 'OK 20 — approuve et provisionne, le lot part'; END $verif$;

-- ─── 21. Une ligne payee ne se re-execute pas ; un lot entame ne s'annule pas
INSERT INTO core.operation (id, kind, shape, origin_party_id, recipient_id, amount_minor,
                            batch_id, batch_seq, request_fingerprint, status)
VALUES ('f0000000-0000-0000-0000-0000000000c1', 'transfer', 'internal',
        'cccccccc-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-00000000000a',
        30000, 'bbbb0000-0000-0000-0000-000000000001', 1, md5('q')||md5('q'), 'draft');
UPDATE core.operation SET quoted_rail_fee_minor = 0, quoted_service_fee_minor = 0,
       quoted_at = now(), status = 'sealed' WHERE id = 'f0000000-0000-0000-0000-0000000000c1';
UPDATE core.operation SET status = 'settled' WHERE id = 'f0000000-0000-0000-0000-0000000000c1';
INSERT INTO core.movement (operation_id, leg, amount_minor,
                           origin_kind, origin_envelope_id,
                           destination_kind, destination_envelope_id, status)
VALUES ('f0000000-0000-0000-0000-0000000000c1', 'principal', 30000,
        'envelope', 'eeeeeeee-0000-0000-0000-0000000000ba',
        'envelope', 'eeeeeeee-0000-0000-0000-00000000000b', 'settled');
UPDATE core.batch_line SET operation_id = 'f0000000-0000-0000-0000-0000000000c1'
 WHERE batch_id = 'bbbb0000-0000-0000-0000-000000000001' AND seq = 1;
UPDATE core.batch_line SET status = 'executing'
 WHERE batch_id = 'bbbb0000-0000-0000-0000-000000000001' AND seq = 1;
UPDATE core.batch_line SET status = 'settled'
 WHERE batch_id = 'bbbb0000-0000-0000-0000-000000000001' AND seq = 1;
UPDATE core.batch SET status = 'partially_settled'
 WHERE id = 'bbbb0000-0000-0000-0000-000000000001';

DO $verif$
BEGIN
  BEGIN
    UPDATE core.batch_line SET status = 'executing'
     WHERE batch_id = 'bbbb0000-0000-0000-0000-000000000001' AND seq = 1;
    RAISE EXCEPTION 'ECHEC : une ligne payee est repartie';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%transition interdite%' THEN
      RAISE NOTICE 'OK 21 — une ligne payee ne se re-execute pas ; on reprend, on ne refait pas';
    ELSE RAISE; END IF;
  END;
  BEGIN
    UPDATE core.batch SET status = 'cancelled' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : un lot dont une partie est partie a ete annule';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%deja partie%' OR SQLERRM LIKE '%transition interdite%' THEN
      RAISE NOTICE 'OK 22 — un lot entame ne s annule pas, il se solde';
    ELSE RAISE; END IF;
  END;
  BEGIN
    UPDATE core.batch SET status = 'closed' WHERE id = 'bbbb0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : un lot a ete cloture avec un reliquat en reserve';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%reliquat%' THEN
      RAISE NOTICE 'OK 23 — le reliquat se rend par un brin, pas par une cloture';
    ELSE RAISE; END IF;
  END;
END
$verif$;

-- ─── 24. Le devis est en deux parts, ou pas du tout ─────────────────────
--     Accident evite : le litige de frais ou personne ne peut dire ce qui
--     etait du au rail et ce qui etait du a SwimPay.
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.operation (kind, shape, origin_party_id, amount_minor,
                                request_fingerprint, quoted_rail_fee_minor, quoted_at)
    VALUES ('transfer', 'internal', 'cccccccc-0000-0000-0000-00000000000a', 1000,
            md5('k')||md5('k'), 500, now());
    RAISE EXCEPTION 'ECHEC : un devis a ete stocke en un seul chiffre';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 24 — le devis separe le frais de rail du frais de service';
  END;
END
$verif$;

-- ─── 25. Conservation : rien n'est cree, rien n'est detruit ─────────────
--     Le seul argent entre est le rechargement de 1 000 000. Rien n'est
--     sorti vers un rail. Toutes les positions et tous les comptes internes
--     doivent donc totaliser exactement 1 000 000.
DO $verif$
DECLARE total bigint; ecarts integer;
BEGIN
  SELECT (SELECT coalesce(sum(balance_minor), 0) FROM core.envelope)
       + (SELECT coalesce(sum(balance_minor), 0) FROM core.internal_account)
    INTO total;
  IF total <> 1000000 THEN
    RAISE EXCEPTION 'ECHEC : % en circulation pour 1000000 entres', total;
  END IF;
  RAISE NOTICE 'OK 25 — la conservation tient : % en circulation', total;

  SELECT count(*) INTO ecarts FROM core.v_controle_position
   WHERE stocke_minor <> derive_minor;
  IF ecarts <> 0 THEN
    RAISE EXCEPTION 'ECHEC : % position(s) divergent de la somme de leurs brins', ecarts;
  END IF;
  RAISE NOTICE 'OK 26 — chaque position stockee egale la somme de ses brins';
END
$verif$;

ROLLBACK;

\echo 'Les invariants de l operation, du brin et du lot tiennent.'
