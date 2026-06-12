# Runbook — Récupération durable du compte marchand (fusion Google)

**Date :** 2026-06-12
**Statut :** PRÊT — **non exécuté**. Nécessite : (1) backend déployé (recover-or-create), (2) release APK v0.1.2 installé, (3) l'utilisateur s'est connecté **une fois** avec Google sur l'app, (4) GO explicite + accès VPS au moment de l'exécution.
**Nature :** write prod réversible (status flips + re-pointage), **pas de DELETE**.

## Contexte (constaté en lecture seule, 2026-06-12)

| Entité | merchant_id (tail) | owner user (tail) | google_sub | Données |
|---|---|---|---|---|
| **RÉEL** R | …1a29f0caca73 (318ce516) | …251683d8849e (OU) | NULL | 11 orders, 11 payment_sessions, 6 api_keys, 8 review_queue/actions, 1 webhook_endpoint, 8 amount_leases, 81 audits |
| **DOUBLON** D | …b0cfd302edb1 (c7bb0dff) | …3f60c79b368d (DU) | NULL | vide (1 route + 1 device + 2 audits, install debug) |

Après l'étape (3), un **3e compte Google-ancré** existe : user **GX** (`google_sub` = le vrai sub de l'utilisateur), merchant **GM** (vide), device **GD** (proof release courant). Objectif : l'utilisateur possède **R** (toutes ses données), ancré sur son identité Google, sur son device courant GD ; D et GM neutralisés.

## Étape 0 — Découverte (lecture seule, au moment de l'exécution)

```sql
-- L'utilisateur Google fraîchement créé (GX/GM) — le plus récent compte android Google-ancré
SELECT u.id AS gx_user, u.google_sub, m.id AS gm_merchant, m.created_at
FROM users u JOIN merchants m ON m.owner_user_id=u.id
WHERE u.account_origin='android_mobile' AND u.google_sub IS NOT NULL
ORDER BY m.created_at DESC LIMIT 5;

-- Son device courant (proof release), rattaché à GM
SELECT id AS gd_device, user_id, merchant_id, left(device_proof_hash,12) AS proof, status, last_seen_at
FROM android_merchant_devices WHERE merchant_id = :GM ORDER BY last_seen_at DESC;
```
Noter : `:GX` (user), `:SUB` (google_sub), `:GM` (merchant vide), `:GD` (device courant + son `device_proof_hash`).
Constantes connues : `:R = 318ce516…`, `:OU = 251683d8849e…`, `:D = c7bb0dff…`, `:DU = 3f60c79b368d…`.

## Étape 1 — Fusion (transaction unique, réversible)

```sql
BEGIN;

-- 1. Libérer le google_sub du compte Google fraîchement créé (UNIQUE → on ne peut pas l'avoir sur 2 users)
UPDATE users SET google_sub = NULL, updated_at = now() WHERE id = :GX;

-- 2. Ancrer le VRAI owner sur l'identité Google
UPDATE users SET google_sub = :SUB, last_login_at = now(), updated_at = now() WHERE id = :OU;

-- 3. Re-pointer le device courant (proof release) vers le VRAI compte
UPDATE android_merchant_devices
   SET user_id = :OU, merchant_id = :R, updated_at = now()
 WHERE id = :GD;

-- 4. Invalider les sessions liées au device courant (forcera un device-recover propre → R)
UPDATE android_merchant_sessions SET revoked_at = now()
 WHERE device_id = :GD AND revoked_at IS NULL;

-- 5. Neutraliser les coquilles vides (réversible : revoked, pas DELETE)
UPDATE merchants SET status = 'revoked', updated_at = now() WHERE id IN (:GM, :D);
UPDATE users     SET status = 'revoked', updated_at = now() WHERE id IN (:GX, :DU);
UPDATE android_merchant_devices SET status = 'revoked', updated_at = now()
 WHERE merchant_id IN (:GM, :D) AND id <> :GD;
UPDATE android_merchant_sessions SET revoked_at = now()
 WHERE merchant_id IN (:GM, :D) AND revoked_at IS NULL;

-- 6. Vérif AVANT commit
SELECT 'real_owner' k, id, google_sub, status FROM users WHERE id = :OU
UNION ALL SELECT 'gx', id, google_sub, status FROM users WHERE id = :GX;
SELECT id AS device, user_id, merchant_id, status FROM android_merchant_devices WHERE id = :GD;
SELECT id AS merchant, status FROM merchants WHERE id IN (:R, :GM, :D);

-- Si tout est cohérent (OU porte :SUB & status active ; GD → R ; R active ; GM/D revoked) :
COMMIT;   -- sinon ROLLBACK;
```

## Étape 2 — Vérification post-commit + côté app
- L'app : se déconnecter / relancer → `device-recover` (proof GD → R) restaure la session sur **R** avec les 11 commandes. Sinon « Se connecter → Google » → `google-exchange` (`:SUB` → OU → R).
- Re-run l'overview du diag (android merchants, merchants-per-google_sub) : attendu = 1 marchand actif (R) ancré sur Google, le reste revoked.

## Rollback
Tout est `status`/`revoked_at` + re-pointage : pour annuler, ré-`UPDATE` les status à `active`, remettre `:GD` sur `:GM`, déplacer `:SUB` de `:OU` vers `:GX`. Aucune donnée détruite.

## Notes de sûreté
- Exécuter dans une transaction ; vérifier les SELECT avant `COMMIT`.
- Ne jamais `DELETE` (FK orders/payment_sessions/webhooks sur R). Le re-anchor garde R intact.
- Le `device_proof_hash` de GD doit être celui de l'install **release** courante ; si l'utilisateur réinstalle après la fusion, il refera simplement « Se connecter → Google » (désormais ancré) — plus de doublon (fix déployé).
