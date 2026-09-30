-- Verification des invariants du carnet, de la file et de l'instruction.
-- S'execute apres 037 et 038, et ECHOUE si une garantie ne tient pas.

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO core.party (id, kind, display_name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'business', 'PME du Plateau'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'person',   'Employe 1');

INSERT INTO core.recipient (id, owner_party_id, display_name, stage, destination_value,
                            destination_hash, preferred_rail)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 'Employe 1', 'saved',
        '+2250707123456', '\x01', 'orange-money-ci');

-- ─── 1. Un destinataire n apparait qu une fois dans un carnet ────────────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.recipient (owner_party_id, display_name, destination_hash)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Doublon', '\x01');
    RAISE EXCEPTION 'ECHEC : le meme destinataire est entre deux fois au carnet';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1 — un destinataire n entre qu une fois au carnet';
  END;
END
$verif$;

-- ... mais deux carnets differents peuvent contenir la meme personne.
INSERT INTO core.party (id, kind, display_name)
VALUES ('aaaaaaaa-0000-0000-0000-000000000003', 'business', 'Autre PME');
INSERT INTO core.recipient (owner_party_id, display_name, destination_hash)
VALUES ('aaaaaaaa-0000-0000-0000-000000000003', 'Employe 1', '\x01');
DO $verif$ BEGIN RAISE NOTICE 'OK 2 — deux carnets peuvent contenir la meme personne'; END $verif$;

-- ─── 3. Le parcours est un cliquet ──────────────────────────────────────
UPDATE core.recipient SET stage = 'invited'
  WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
UPDATE core.recipient SET stage = 'active'
  WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
DO $verif$ BEGIN RAISE NOTICE 'OK 3 — le parcours monte : saved, invited, active'; END $verif$;

DO $verif$
BEGIN
  BEGIN
    UPDATE core.recipient SET stage = 'saved'
      WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'ECHEC : un destinataire actif est redescendu';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%ne redescend pas%' THEN
      RAISE NOTICE 'OK 4 — un actif ne redescend jamais';
    ELSE
      RAISE;
    END IF;
  END;
END
$verif$;

-- ─── 5. Un jeton d invitation ne sert qu une fois ───────────────────────
INSERT INTO core.invitation (recipient_id, inviter_party_id, token_hash)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', '\xAA');

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.invitation (recipient_id, inviter_party_id, token_hash)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000001', '\xAA');
    RAISE EXCEPTION 'ECHEC : deux invitations partagent le meme jeton';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 5 — un jeton d invitation est unique';
  END;
END
$verif$;

-- ─── 6. Une instruction directe n a ni rail ni destination ──────────────
INSERT INTO core.instruction
  (kind, origin_party_id, origin_account_id, recipient_id, direct, amount_minor, idempotency_key)
VALUES ('transfer', 'aaaaaaaa-0000-0000-0000-000000000001', 'compte-1',
        'bbbbbbbb-0000-0000-0000-000000000001', true, 50000, 'cle-directe');
DO $verif$ BEGIN RAISE NOTICE 'OK 6 — un envoi direct passe sans rail'; END $verif$;

DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.instruction
      (kind, origin_party_id, origin_account_id, recipient_id, direct, rail,
       amount_minor, idempotency_key)
    VALUES ('transfer', 'aaaaaaaa-0000-0000-0000-000000000001', 'compte-1',
            'bbbbbbbb-0000-0000-0000-000000000001', true, 'orange-money-ci',
            50000, 'cle-incoherente');
    RAISE EXCEPTION 'ECHEC : un envoi direct a ete accepte avec un rail';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 7 — un envoi direct ne porte pas de rail';
  END;
END
$verif$;

-- ─── 8. Un envoi par rail exige rail ET destination ─────────────────────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.instruction
      (kind, origin_party_id, origin_account_id, recipient_id, direct, rail,
       amount_minor, idempotency_key)
    VALUES ('payout', 'aaaaaaaa-0000-0000-0000-000000000001', 'compte-1',
            'bbbbbbbb-0000-0000-0000-000000000001', false, 'orange-money-ci',
            50000, 'cle-sans-destination');
    RAISE EXCEPTION 'ECHEC : un envoi par rail est parti sans destination';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 8 — un envoi par rail exige sa destination';
  END;
END
$verif$;

-- ─── 9. Le meme geste deux fois ne fait qu une operation ────────────────
DO $verif$
BEGIN
  BEGIN
    INSERT INTO core.instruction
      (kind, origin_party_id, origin_account_id, recipient_id, direct,
       amount_minor, idempotency_key)
    VALUES ('transfer', 'aaaaaaaa-0000-0000-0000-000000000001', 'compte-1',
            'bbbbbbbb-0000-0000-0000-000000000001', true, 50000, 'cle-directe');
    RAISE EXCEPTION 'ECHEC : la meme instruction est passee deux fois';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 9 — deux fois le meme geste ne font qu une operation';
  END;
END
$verif$;

-- ─── 10. Rien ne s execute sans que le devis ait ete montre ─────────────
DO $verif$
BEGIN
  BEGIN
    UPDATE core.instruction SET status = 'executing' WHERE idempotency_key = 'cle-directe';
    RAISE EXCEPTION 'ECHEC : une instruction est partie sans devis montre';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK 10 — pas d execution sans devis montre a l utilisateur';
  END;
END
$verif$;

UPDATE core.instruction
  SET quoted_fee_minor = 0, quoted_delay = 'immediat', quoted_at = now(), status = 'executing'
  WHERE idempotency_key = 'cle-directe';
DO $verif$ BEGIN RAISE NOTICE 'OK 11 — avec le devis, l execution est permise'; END $verif$;

ROLLBACK;

\echo 'Les onze invariants du carnet, de la file et de l instruction tiennent.'
