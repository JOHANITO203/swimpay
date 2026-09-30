-- Verification des invariants du module FNE.
-- S'execute apres 037, 038 et 039, et ECHOUE si une garantie ne tient pas.
--
-- Chaque test correspond a un sticker brule ou a un document fiscal faux qu'on
-- ne veut jamais produire.

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO core.party (id, kind, display_name) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'business', 'Quincaillerie de Yopougon');

INSERT INTO core.fne_credential (id, merchant_party_id, environment, ncc, base_url,
                                 api_key_ref, api_key_fingerprint, state)
VALUES ('dddddddd-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001', 'prod', '9606123E',
        'https://fne.dgi.gouv.ci/ws', 'vault://fne/9606123E', '\x01', 'active');

INSERT INTO core.invoice (id, merchant_party_id, invoice_type, template, payment_method,
                          lines, total_ht, total_tva, total_ttc, number_local, fne_status,
                          point_of_sale, establishment)
VALUES ('eeeeeeee-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001', 'sale', 'B2C', 'cash',
        '[]'::jsonb, 100000, 18000, 118000, '2026-000001', 'queued', '23', 'Yopougon');

INSERT INTO core.invoice_item (id, invoice_id, line_no, reference, description, quantity,
                               unit_price_ht, tax_code, base_ht, tva)
VALUES ('ffffffff-0000-0000-0000-000000000001',
        'eeeeeeee-0000-0000-0000-000000000001', 1, 'ref001', 'Sac de ciment', 10,
        10000, 'TVA', 100000, 18000);

-- ─── 1. Un bordereau d achat ne porte pas de TVA ─────────────────────────
DO $verif$
BEGIN
  INSERT INTO core.invoice (id, merchant_party_id, invoice_type, template, payment_method,
                            lines, total_ht, total_tva, total_ttc, number_local, fne_status)
  VALUES ('eeeeeeee-0000-0000-0000-000000000002',
          'cccccccc-0000-0000-0000-000000000001', 'purchase', 'B2B', 'mobile-money',
          '[]'::jsonb, 500000, 0, 500000, '2026-000002', 'draft');
  BEGIN
    INSERT INTO core.invoice_item (invoice_id, line_no, reference, description, quantity,
                                   unit_price_ht, tax_code, base_ht, tva)
    VALUES ('eeeeeeee-0000-0000-0000-000000000002', 1, 'cacao', 'Cacao brut', 2000,
            250, 'TVA', 500000, 90000);
    RAISE EXCEPTION 'ECHEC : une TVA indue est passee sur un bordereau d achat';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 1 — un bordereau d achat refuse la TVA';
  END;
END
$verif$;

-- ─── 2. Une donnee de production ne part pas vers l environnement de test ─
DO $verif$
BEGIN
  INSERT INTO core.fne_credential (id, merchant_party_id, environment, ncc, base_url,
                                   api_key_ref, api_key_fingerprint, state)
  VALUES ('dddddddd-0000-0000-0000-000000000002',
          'cccccccc-0000-0000-0000-000000000001', 'test', '9606123E',
          'http://54.247.95.108/ws', 'vault://fne/test', '\x02', 'active');
  BEGIN
    INSERT INTO core.fne_attempt (invoice_id, attempt_no, endpoint, credential_id,
                                  environment, base_url, request_hash, request_body)
    VALUES ('eeeeeeee-0000-0000-0000-000000000001', 1, 'sign',
            'dddddddd-0000-0000-0000-000000000002', 'test', 'http://54.247.95.108/ws',
            '\x00', '{}'::jsonb);
    RAISE EXCEPTION 'ECHEC : une donnee de production est partie en clair vers le test';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 2 — la production ne part pas vers l environnement de test';
  END;
END
$verif$;

-- ─── 3. Une seule tentative ouverte par facture (single-flight) ──────────
INSERT INTO core.fne_attempt (id, invoice_id, attempt_no, endpoint, credential_id,
                              environment, base_url, request_hash, request_body)
VALUES ('aaaa1111-0000-0000-0000-000000000001',
        'eeeeeeee-0000-0000-0000-000000000001', 1, 'sign',
        'dddddddd-0000-0000-0000-000000000001', 'prod', 'https://fne.dgi.gouv.ci/ws',
        '\x0a', '{"invoiceType":"sale"}'::jsonb);

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.fne_attempt (invoice_id, attempt_no, endpoint, credential_id,
                                  environment, base_url, request_hash, request_body)
    VALUES ('eeeeeeee-0000-0000-0000-000000000001', 2, 'sign',
            'dddddddd-0000-0000-0000-000000000001', 'prod', 'https://fne.dgi.gouv.ci/ws',
            '\x0b', '{}'::jsonb);
    RAISE EXCEPTION 'ECHEC : deux tentatives ouvertes sur la meme facture';
  EXCEPTION WHEN raise_exception OR unique_violation THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 3 — une seule tentative ouverte a la fois';
  END;
END
$verif$;

-- La tentative se clot en doute : la requete est partie, la reponse manque.
UPDATE core.fne_attempt
   SET outcome = 'uncertain', outcome_reason = 'timeout_after_send', finished_at = now()
 WHERE id = 'aaaa1111-0000-0000-0000-000000000001';
UPDATE core.invoice SET fne_status = 'submitted' WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
UPDATE core.invoice SET fne_status = 'uncertain' WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';

-- ─── 4. Une tentative close ne se rouvre pas ────────────────────────────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.fne_attempt SET finished_at = NULL, outcome = NULL
     WHERE id = 'aaaa1111-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : une tentative close a ete rouverte';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 4 — une tentative close est une piece a conviction';
  END;
END
$verif$;

-- ─── 5. Pas de sortie du doute sans resolution humaine ──────────────────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.invoice SET fne_status = 'validated_local'
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : une facture est sortie du doute toute seule';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 5 — le doute ne se ferme que par un humain';
  END;
END
$verif$;

-- ─── 6. Une transition interdite est refusee ────────────────────────────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.invoice SET fne_status = 'rejected'
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : uncertain -> rejected a ete accepte';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 6 — la machine a etats refuse ce qui n est pas prevu';
  END;
END
$verif$;

-- Un humain retrouve la facture dans l espace FNE et saisit ce qu il lit.
INSERT INTO core.fne_resolution (invoice_id, attempt_id, decision, fne_ref, fne_token,
                                 fne_invoice_id, item_ids, actor)
VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001',
        'found_certified', '9606123E26000000019',
        'http://fne/verification/019465c1', 'e2b2d8da-a532-4c08-9182-f5b428ca468d',
        '[{"line_no":1,"dgi_item_id":"50b5c9d9-e22d-4dce-ba3c-5d2519c3418f"}]'::jsonb,
        'agent.support');

UPDATE core.invoice
   SET fne_status = 'accepted',
       fne_ref = '9606123E26000000019',
       fne_token = 'http://fne/verification/019465c1',
       fne_invoice_id = 'e2b2d8da-a532-4c08-9182-f5b428ca468d'
 WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';

UPDATE core.invoice_item SET dgi_item_id = '50b5c9d9-e22d-4dce-ba3c-5d2519c3418f'
 WHERE id = 'ffffffff-0000-0000-0000-000000000001';

-- ─── 7. Une facture certifiee ne se renvoie jamais ──────────────────────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.fne_attempt (invoice_id, attempt_no, endpoint, credential_id,
                                  environment, base_url, request_hash, request_body)
    VALUES ('eeeeeeee-0000-0000-0000-000000000001', 2, 'sign',
            'dddddddd-0000-0000-0000-000000000001', 'prod', 'https://fne.dgi.gouv.ci/ws',
            '\x0c', '{}'::jsonb);
    RAISE EXCEPTION 'ECHEC : une facture deja certifiee est repartie';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 7 — pas de doublon officiel';
  END;
END
$verif$;

-- ─── 8. Le numero officiel ne change jamais ─────────────────────────────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.invoice SET fne_ref = '9606123E26000000042'
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : le numero officiel a ete reecrit';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 8 — le numero officiel est fige';
  END;
END
$verif$;

-- ─── 9. Le cumul des avoirs ne depasse pas la quantite vendue ───────────
INSERT INTO core.invoice (id, merchant_party_id, invoice_type, template, payment_method,
                          lines, total_ht, total_tva, total_ttc, number_local, fne_status,
                          refund_of_id, fne_ref, fne_token)
VALUES ('eeeeeeee-0000-0000-0000-000000000003',
        'cccccccc-0000-0000-0000-000000000001', 'refund', 'B2C', 'cash',
        '[]'::jsonb, 60000, 10800, 70800, '2026-000003', 'accepted',
        'eeeeeeee-0000-0000-0000-000000000001',
        'A9606123E2600000006', 'http://fne/verification/019465ca');

INSERT INTO core.invoice_item_refund (refund_invoice_id, origin_item_id, quantity)
VALUES ('eeeeeeee-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000001', 6);

DO $verif$
BEGIN
  INSERT INTO core.invoice (id, merchant_party_id, invoice_type, template, payment_method,
                            lines, total_ht, total_tva, total_ttc, number_local, fne_status,
                            refund_of_id)
  VALUES ('eeeeeeee-0000-0000-0000-000000000004',
          'cccccccc-0000-0000-0000-000000000001', 'refund', 'B2C', 'cash',
          '[]'::jsonb, 50000, 9000, 59000, '2026-000004', 'submitted',
          'eeeeeeee-0000-0000-0000-000000000001');
  BEGIN
    INSERT INTO core.invoice_item_refund (refund_invoice_id, origin_item_id, quantity)
    VALUES ('eeeeeeee-0000-0000-0000-000000000004', 'ffffffff-0000-0000-0000-000000000001', 5);
    RAISE EXCEPTION 'ECHEC : on a rendu 11 articles sur 10 vendus';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 9 — le cumul des avoirs est plafonne a la quantite vendue';
  END;
END
$verif$;

-- ─── 10. Le journal des stickers ne se reecrit pas ──────────────────────
INSERT INTO core.sticker_observation (merchant_party_id, balance, warning_raw, source)
VALUES ('cccccccc-0000-0000-0000-000000000001', 179, 'false', 'sign');

DO $verif$
BEGIN
  BEGIN
    UPDATE core.sticker_observation SET balance = 999
     WHERE merchant_party_id = 'cccccccc-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : une observation de solde a ete reecrite';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'ECHEC%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 10 — le solde est un journal, pas un instantane';
  END;
END
$verif$;

-- ─── 11. Une facture certifiee ne se rend pas sans son QR ───────────────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.invoice SET doc_state = 'delivered'
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'ECHEC : un brouillon a ete remis au client';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 11 — on ne remet que ce qui est certifie';
  END;
END
$verif$;

ROLLBACK;
