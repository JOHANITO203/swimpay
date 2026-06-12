# Spec — Compte : « recover-or-create » ancré sur Google (anti-doublon)

**Date :** 2026-06-12
**Statut :** validé (approche) — sous-projet « régression compte/doublons »
**Type :** colonne (fiabilité compte) — sécurité-critique (binding compte + OAuth)

## Problème

À la réinstallation Android, la clé Keystore d'installation est régénérée → nouveau `device_proof_hash`. La porte « Créer un compte » est atteignable par un utilisateur qui revient, et `createAndroidMerchantAccount` est **purement device-keyed** : aucun device ne matche → il crée un **nouveau marchand orphelin** (`google_sub = NULL`). L'utilisateur se retrouve connecté à un marchand vide ; son vrai marchand (qui détient le `google_sub`) reste intact mais inaccessible. `users.google_sub` étant `UNIQUE` (migration 010), la tentative ultérieure de lier Google au doublon lève `google_sub_conflict` → l'orphelin reste sans Google. Chaque réinstall+create répété = un orphelin de plus → incohérences webhook (signaux/marchands divergents).

Le **seul** mécanisme de récupération cross-réinstall est Google (`recoverAndroidMerchantAccountWithGoogle` via `google_sub`). En debug, le cert ≠ release casse l'OAuth d'emblée → récupération impossible → l'utilisateur est forcé vers « Créer » (incident observé).

## Décision (validée)

**La création devient « recover-or-create » ancrée sur Google.** `POST /android-merchant/account/create` porte désormais l'`id_token` Google (déjà vérifié par `googleIdTokenVerifier`, comme `google-exchange`). Le backend, dans **une seule transaction** :

1. Cherche un user par `google_sub` (FOR UPDATE).
2. **Si l'utilisateur Google possède déjà un marchand owner/admin actif → RÉCUPÈRE** (ré-attache/réutilise le device par `device_proof_hash`, mint session) — même logique que `recoverAndroidMerchantAccountWithGoogle`. Renvoie `recovered`.
3. **Sinon → CRÉE** un user **déjà lié** (`google_sub = <sub>`, email = email Google si présent sinon synthétique), marchand, membership owner, device, session. Renvoie `created`.
4. Garde-fou device inchangé : si le `device_proof_hash` est déjà pris par un **autre** user/marchand → `device_already_registered`.

Invariant garanti : *après cet endpoint, le device est rattaché à l'unique marchand possédé par ce `google_sub` ; aucun nouveau marchand n'est jamais créé si le `google_sub` en possède déjà un.* → doublon impossible pour un utilisateur Google.

`google-exchange` (chemin « Se connecter ») et `device-recover` (device déjà connu) restent inchangés.

## Cadrage

**Dans le périmètre :**
- Backend : `createAndroidMerchantAccount` (recover-or-create), route `create` (exige + vérifie `id_token`), contrats de requête, tests (`auth-bff.test.ts`, `android-merchant.test.ts`).
- Client Android : le flux « Créer un compte » obtient un `id_token` Google (sign-in) **avant** d'appeler `create`, et le transmet ; transport `/account/create` enrichi.
**Hors périmètre :**
- Récupération opérationnelle du compte de l'utilisateur (install APK release-cert, device-gated).
- Dédup des marchands orphelins déjà en prod (VPS + GO, lecture seule d'abord).
- Matching/décision (P1), identité d'hôte (M).

## Changement de contrat (assumé, pas un affaiblissement)

`create` exige maintenant `id_token`. Les tests qui appelaient `create` sans Google sont **mis à jour** pour refléter le nouveau contrat (TDD : écrire d'abord le comportement attendu recover-or-create), pas affaiblis. Google devient requis à la création (décision produit validée).

## Tests (TDD)
- create avec un `google_sub` **nouveau** → `created`, user porte le `google_sub` (jamais NULL), merchant/membership/device/session créés.
- create avec un `google_sub` **possédant déjà un marchand** + **device neuf** → `recovered`, **aucun nouveau marchand**, device ré-attaché au marchand existant.
- create avec `device_proof_hash` appartenant à un **autre** user → `device_already_registered`.
- create sans `id_token` / token invalide → rejet (400/401).
- Régression : `google-exchange` et `device-recover` inchangés ; rôles non-owner toujours rejetés.

## Câblage & migration
- Aucune migration DB requise (schéma inchangé ; `google_sub UNIQUE` déjà présent).
- Client : ProfileChoice → sign-in Google → `create(id_token, profileType, businessLabel)`.

## Vérification
- `npm test` (workspace api) vert, nouveaux tests inclus.
- `npm run android:compile` + `npm run android:test` verts.

## Relation au programme
- Ferme la porte du doublon **à la source** (création). Complète la récupération Google existante. Ne touche ni P1 ni M.
