# Spec — Cohérence produit : « receiving-first », honnêteté, fin du faux

**Date :** 2026-06-12
**Statut :** à valider (1 validation = cette spec) — sous-projet « cohérence produit »
**Type :** réalignement transversal (onboarding · détection · moyens de réception · données · design)
**Principe directeur (LO) :** *un réseau cohérent — chaque élément relié au suivant ; un seul axe produit : « sur quoi l'utilisateur reçoit ». Le reste en découle. Zéro faux, zéro preview en prod. Le design vient en DERNIER, une fois la logique saine.*

## Constat (vérité du code, audit 2026-06-12)

1. **Détection d'apps à l'onboarding = FAUSSE.** Le bloc « Apps surveillées » (`MonitoredAppsRow`, PremiumOnboardingScreens.kt:378-407) affiche 5 logos en dur + « +6 ». Aucune énumération : pas de `PackageManager`/`getInstalledApplications` dans l'app. Le réel = un **filtre de notifications** par allowlist (`ReceiverBoundaries.isRuntimeNotificationAllowed`, `enabledBankPackages`), post-onboarding.
2. **« SDK host identity » (remplacer « canal reconnu » par le vrai logo/nom de l'app source) = NON implémentée.** Toute copie qui sous-entend que l'app « reconnaît » l'app source est non fondée aujourd'hui.
3. **Onboarding incohérent** : mélange deux concepts — « banques compatibles » (= allowlist de notifs, `enabledBankProfileIds`) et « moyen de réception » (= destination de paiement, `merchant_receiving_routes`) — faiblement reliés. La liste est un **catalogue global figé** (BankTargetLock.kt:67) ; **les wallets Afrique de l'Ouest (Wave/Orange/MTN) ne sont pas proposables à l'onboarding** (seulement après).
4. **Données preview/mockup** dans les écrans redessinés (Accueil, Activité, Détail portefeuille…) là où le `UiState` n'a pas le champ (historiques, agrégats, sparklines, provenance, payeurs).

## Décisions (validées dans le principe par LO)

### D1 — Modèle unique « receiving-first »
L'unique axe produit = **les moyens de réception / wallets sur lesquels l'utilisateur veut recevoir**. L'utilisateur déclare ses moyens depuis **un seul catalogue unifié** (RU banks + WA mobile money + INT neobanks). De ce choix **découlent automatiquement** :
- les **destinations** de paiement (`merchant_receiving_routes`),
- l'**allowlist de notifications** (`enabledBankPackages`) — **dérivée**, jamais un écran manuel séparé.

### D2 — Onboarding = matérialisation de ce choix
Supprimer l'étape « banques compatibles » (allowlist manuelle). L'onboarding devient : *bienvenue → choisis tes moyens de réception (catalogue unifié, toutes régions) → accès notifications (cadré honnêtement, dérivé des moyens choisis) → (site connecté / test)*. L'allowlist se construit à partir des moyens choisis.

### D3 — Catalogue unifié, toutes régions
Un catalogue unique de moyens de réception couvrant RU / WA / INT, utilisé **partout** (onboarding ET écran moyens de réception). Fin de la scission « Russie+Inter à l'onboarding / WA après ». Source de vérité unique (fusionner `BankTargetLock.supportedTargets` + `WestAfricaReceivingCatalog.wallets` derrière une seule façade catalogue).

### D4 — Honnêteté de la détection
- Retirer le bloc décoratif « Apps surveillées ». Si on montre des apps, ce sont **les apps réellement dérivées** des moyens choisis (la vraie allowlist), pas une liste en dur.
- Réécrire toute copie qui prétend « détecter/surveiller des apps ». Cadrage honnête : *« on lit la notification de paiement de l'app où tu reçois ; jamais les SMS ni les autres apps ; jamais le texte brut conservé »* — ce qui est vrai (cf. P3).
- « canal reconnu » / host-identity : tant que le module M n'existe pas, **copie honnête** (pas de prétention). Le module M (vrai logo/nom de l'app source) reste un chantier ultérieur, hors de cette spec — mais la copie ne doit rien promettre qu'on ne fait pas.

### D5 — Fin du faux/preview en prod
Pour **chaque** widget alimenté en preview : soit **câbler la vraie donnée** (étendre `UiState` + `PremiumMerchantRuntime` + l'API si la donnée existe), soit **retirer le widget**. Règle absolue : **si la donnée réelle n'existe pas, le widget n'existe pas.** Aucun chiffre/élément inventé ne subsiste.

### D6 — Le design en DERNIER
Une fois D1–D5 livrés et la logique saine, faire la passe **design fintech niveau prod** (référence-driven : Revolut/Wise/Mercury/Ramp/Cash App/Monzo/Qonto/Lydia ; design system réel — typo grotesk + chiffres tabulaires, palette retenue + 1 accent, profondeur tactile, vraie motion). Approche outillage à décider à ce moment (prototype web → port Compose, ou Compose référence-driven). **Pas de design tant que la cohérence n'est pas faite.**

## Architecture cible

- **Catalogue** : façade unique `ReceivingCatalog` (régions RU/WA/INT, chaque entrée = id, nom, logo officiel, type de moyen, package de notif). Remplace les deux sources éclatées comme surface publique.
- **Onboarding** (`PremiumOnboardingState` + `PremiumOnboardingScreens`) : retirer `COMPATIBLE_BANK_SELECTION` ; l'étape moyen-de-réception consomme `ReceivingCatalog` (toutes régions) ; `enabledBankProfileIds` **dérivé** des moyens choisis à `finishOnboarding` (PremiumMerchantApp.kt:223-291).
- **Runtime** : `ReceiverRuntimeConfig.enabledBankPackages` dérivé des moyens de réception actifs (déjà partiellement le cas via `enabledBankProfileIds` → packages ; le rendre la **conséquence** des routes, pas d'un choix parallèle).
- **Données** : pour chaque écran redessiné, lister les champs preview ; étendre `PremiumXxxUiState` + loaders runtime + endpoints API quand la donnée existe (paiements reçus, agrégats par moyen, provenance, payeurs récents) ; sinon retirer.
- **Copie** : `PremiumLocalizedCopy` — purger toute formulation « détecte/surveille des apps » et « canal reconnu » non fondée ; libellés honnêtes FR/EN/RU.

## Périmètre

**Dans le périmètre :** catalogue unifié ; onboarding receiving-first ; dérivation allowlist ; retrait du faux (bloc apps surveillées + copie) ; câblage/retrait des widgets preview ; copie honnête. **Design = dernière étape du même chantier.**
**Hors périmètre :** module M (host-identity réel — chantier ultérieur ; ici on s'interdit seulement de mentir) ; matching/décision P1 ; P3 (déjà fait).

## Ordre d'exécution (cohérence d'abord, design en dernier)

1. **T1 — Catalogue unifié** `ReceivingCatalog` (source unique RU/WA/INT) + tests.
2. **T2 — Onboarding receiving-first** : retrait étape allowlist, étape moyens depuis le catalogue unifié, dérivation `enabledBankProfileIds`/packages ; flow test vert.
3. **T3 — Honnêteté** : retrait `MonitoredAppsRow` décoratif (ou version réelle dérivée) ; purge copie malhonnête ; libellés honnêtes.
4. **T4 — Fin du preview** : audit widget par widget → câbler le réel (UiState/runtime/API) ou retirer ; aucun faux résiduel.
5. **T5 — Vérif cohérence** : onboarding ↔ moyens ↔ allowlist ↔ dashboard reliés et alimentés en réel ; suite de tests verte.
6. **T6 — Design** (dernier) : passe fintech niveau prod, référence-driven, sur une base désormais cohérente et réelle.

## Tests
- Choisir un moyen WA (Wave) à l'onboarding → route créée **et** package Wave dans l'allowlist dérivée (un seul choix, double conséquence).
- Aucune référence en dur d'« apps surveillées » ; la liste affichée = dérivée des moyens.
- Aucun widget ne rend de donnée non issue du `UiState`/runtime (test source : pas de listes preview dans les écrans).
- Catalogue unique : onboarding et écran moyens exposent le même ensemble.
- Copie : pas de formulation prétendant détecter des apps / reconnaître l'app source.

## Vérification
- `npm run android:compile` + `npm run android:test` verts à chaque T.
- Revue deux étages par tâche (subagent), workflow LO (AUDIT→PLAN→IMPLEMENT→REVIEW→…).
