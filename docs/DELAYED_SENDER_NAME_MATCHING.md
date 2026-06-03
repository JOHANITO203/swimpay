# Élément retardé volontairement — Matching par nom de l'expéditeur (bout-en-bout)

> Décision : 2026-06. Statut : **reporté volontairement** (pas abandonné).
> Élément : « nom expéditeur de bout en bout » (B / VA1b). À ne pas confondre avec
> VA1a (le moteur), qui est **déjà livré sur `main`**.

## Ce qui est livré vs ce qui est reporté
- ✅ **Livré (VA1a, sur `main`)** : le moteur de matching *sait* exploiter une empreinte de nom expéditeur (`evaluateSenderNameCompatibility`, score +5, vecteur de confiance). Inerte tant que rien ne l'alimente.
- ⏸️ **Reporté (VA1b)** : le bout-en-bout qui *alimente* le moteur — le téléphone receiver émet une empreinte du vrai nom, et le backend la compare aux variantes du nom acheteur.

## Pourquoi c'est retardé (4 raisons)
1. **Confidentialité.** Aujourd'hui le receiver n'envoie que des **marqueurs de présence** (`<PHONE>`, `<PERSON>`), jamais la vraie valeur — c'est un invariant privacy assumé. Faire matcher le nom impose de hasher le **vrai** nom normalisé : c'est un **changement de la frontière de confidentialité** qui doit être décidé explicitement (produit + légal), pas glissé en douce.
2. **Crypto / clé.** Un matching réel exige un **HMAC à clé partagée device↔backend**. Cette clé partagée a justement été **retirée** du code (le receiver signe en asymétrique, pas en HMAC à secret partagé). Il faut reconcevoir proprement la distribution de clé.
3. **Validable seulement sur device.** Impossible à tester sans **un téléphone réel + le backend ensemble** (intégration). L'inclure dans un APK release = livrer une logique non testée.
4. **Valeur nulle en V1.** L'**auto-confirmation est désactivée** (V1 manuel-d'abord, cf. `ADR 0005` + `SIGNAL_RUNTIME_PIPELINE.md`). Tout paiement passe de toute façon en **validation manuelle** : le nom ne change le résultat **que** le jour où l'auto-confirmation est activée.

## Impact business
| Horizon | Impact |
|---|---|
| **Aujourd'hui (V1 manuel)** | **Aucun.** Ne pas livrer B ne dégrade rien — tout est déjà en review manuelle. |
| **Demain (auto-confirmation activée)** | Signal d'identité supplémentaire → plus de matchs **haute-confiance** → **moins de review manuelle** → UX « comme un PSP » + moins de charge pour le marchand. B est un **multiplicateur de l'auto-confirmation**, pas une feature isolée. |
| **Si bâclé** | Faux matchs / fuite de données d'identité → **bien pire que l'absence**. C'est précisément la raison du report assumé. |

**En clair** : B ne rapporte rien tant qu'on confirme à la main, et coûte cher s'il est mal fait. Le livrer maintenant serait du risque sans bénéfice.

## Conditions pour lever le report (Definition of Ready)
1. **Décision privacy validée** : autoriser l'empreinte (HMAC) d'un nom normalisé — non réversible sans la clé.
2. **Schéma de clé** device↔backend défini et sécurisé.
3. **Auto-confirmation** décidée/planifiée (sinon B reste inutile).
4. **Banc de test** device + backend pour valider de bout en bout.

## Liens
- Moteur prêt : `packages/matching-core/src/index.ts` (VA1a) + `packages/matching-core/src/sender-name-compatibility.test.ts`.
- Règles de matching : `docs/10_MATCHING_AND_SCORING.md`.
- Contrainte déterministe : `adr/0005-no-llm-in-payment-decision.md`.
- Pipeline runtime / auto-confirm désactivé : `docs/SIGNAL_RUNTIME_PIPELINE.md`.
