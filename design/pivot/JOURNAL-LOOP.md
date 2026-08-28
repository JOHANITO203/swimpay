# Boucle de livraison — SwimPay acide, l'app complète

## La consigne (verbatim, 2026-08-28)

> délivrez toute l'UX de l'app et toute l'UI de l'app ainsi que les flows

Direction validée par le commanditaire : la robe « acide » (v6) et son flow
d'envoi à clôture animée. Tout se décline dans cette robe, dans le même
artifact navigable (une URL).

## Definition of done — par écran

1. **Construit** : mobile-first + déclinaison desktop, un seul élément
   acide, montants sans devise, aucune référence géographique ni marque
   tierce.
2. **Relié** : chaque bouton du flow mène quelque part (`data-va` /
   `data-mene`), l'écran est atteignable depuis l'accueil ou l'onboarding.
3. **Sondé** : `sonde-app.mjs` (structure) + `sonde-parcours.mjs`
   (interactions par clics réels, CDP, 390 émulé).
4. **Livré** : artifact republié + commit.

## Backlog — ÉTAT FINAL : 27/27 vérifiés

| # | écran (id) | flow | sondé |
|---|---|---|---|
| 1 | Accueil `accueil` | hub → tout ; grand livre vivant | ✔ |
| 2 | Envoyer `envoyer` | numpad réel → clôture | ✔ |
| 3 | Transfert envoyé `envoye` | clôture animée générique (4 flux la partagent) | ✔ |
| 4 | Activité `activite` | chips filtrantes, anneau, → sheet | ✔ |
| 5 | Ma carte `carte-ecran` | onglets Détails/Activité, actions | ✔ |
| 6 | Sheet détail (globale) | toute rangée `.ops` ; Échap/voile | ✔ |
| 7 | Notifications `notifs` | cloches → ici ; « Tout lire » éteint | ✔ |
| 8 | Splash `splash` | auto → bienvenue (1,6 s ou tap) | ✔ |
| 9 | Bienvenue `bienvenue` | carte penchée, mot acide, 2 CTA | ✔ |
| 10 | Téléphone `onb-tel` | pad ; CTA armé à 10 chiffres | ✔ |
| 11 | OTP `onb-otp` | 5 cases, liseré actif, auto-suite | ✔ |
| 12 | Nom `onb-nom` | champ ; nourrit la carte du 14 | ✔ |
| 13 | Code secret `onb-pin` | 4 points, auto-suite | ✔ |
| 14 | Compte prêt `onb-pret` | coche animée, prénom réel | ✔ |
| 15 | Recevoir `recevoir` | pseudo-QR, partager/copier, badge montant | ✔ |
| 16 | Demander `demande` | pad → badge + QR regénéré | ✔ |
| 17 | Scanner `scanner` | viseur, balayage, simuler | ✔ |
| 18 | Payer marchand `payer` | vérifié → clôture « Paiement effectué » | ✔ |
| 19 | Entre réseaux `swap` | inversion A⇄B réelle, récap → clôture | ✔ |
| 20 | Vers la banque `banque` | récap « sous 3 h » → clôture | ✔ |
| 21 | Mes reçus `recus` | rangées → sheet ; relevé mensuel | ✔ |
| 22 | Profil `profil` | identité, PIN → écran 13, bascules, jauges | ✔ |
| 23 | Choix de profil `profils` | 5 cartes → 5 mondes | ✔ |
| 24 | Commerçant `b-commercant` | caisse → QR → « Paiement reçu » crédité | ✔ |
| 25 | Salaires PME `b-pme` | 5 versements en cascade animée | ✔ |
| 26 | Comptable `b-comptable` | clients, à-valider décrémente | ✔ |
| 27 | E-commerce `b-ecommerce` | commande + payer → confirmé | ✔ |

Hors périmètre assumé (à demander si voulu) : recherche globale, contenu
d'aide, écrans d'erreur réseau, onglet Activité par carte secondaire,
détail client comptable.

## Journal des boucles

### Boucle 0 — mise en place
- Journal + `sonde-app.mjs` (débords 390/1280, cibles cassées,
  atteignabilité par graphe `data-va`/`data-mene`). Nettoyé l'alias
  `carte`→`carte-ecran`. Baseline verte : 5 écrans, 0 défaut.

### Boucle A — cœur complété
- Onglet Activité de Ma carte, sheet de détail (délégation `.ops`),
  Notifications. Sonde : 6 écrans, 0 défaut. « envoye » orphelin =
  faux positif (arête JS) → convention `data-mene` adoptée.

### Boucle B — onboarding
- 7 écrans reliés, pads injectés (`PAD_HTML`), logo cloné depuis la
  topbar, `data-anime` généralisé (clôture ET compte-prêt rejouables).
  Sonde : 13 écrans, 0 défaut. Œil : bienvenue/OTP/prêt conformes.

### Boucle C — services + profil
- Clôture GÉNÉRALISÉE (`cloture({titre, sous, montant, nom, categorie})`)
  : envoyer / payer / swap / banque partagent l'écran et le grand livre.
  Flux à montant génériques (`data-pad="m:*"`). QR seedé regénérable.
  Sonde : 21 écrans, 0 défaut.

### Boucle D — business
- Choix de profil + 4 mondes. Commerçant : la clôture vit DANS `b-qr`
  (le terminal reste en place), caisse du jour créditée. PME : cascade
  spinner→coche par employé. Comptable : valider décrémente. E-commerce :
  panneau payer→confirmé. Sonde : 27 écrans, 0 cassée, 0 orphelin,
  0 débord.

### Boucle E — vérification de bout en bout (finale)
- `sonde-parcours.mjs` : 25 assertions par clics réels sur les 13 flows.
- 1 échec initial : « Échap ferme la sheet » — **mensonge de sonde**
  (KeyboardEvent synthétique sans `bubbles: true` n'atteint pas le
  listener `window` ; une vraie touche bubble). Sonde corrigée.
- **Verdict final : 25/25 PASS.** Republication + commit.

---

# BOUCLE 2 — les mondes en profondeur (2026-08-28)

## La consigne (verbatim)

> recrée une nouvelle boucle dans laquelle tu vas développer les écrans du
> profil commerçant et tous les flows d'action possibles par ce profil,
> tu feras de même pour tous les autres sous-écrans des profils existants

Même DoD, mêmes sondes. Les listes vivantes passent en **données rendues
par JS** (équipe, ventes, factures, commandes) pour que les flows qui les
modifient restent cohérents partout.

## Backlog Boucle 2

ÉTAT FINAL : 19/19 vérifiés — 43 écrans au total dans l'app.

| # | écran (id) | flow vérifié par clics réels | sondé |
|---|---|---|---|
| 28 | Hub commerçant (`b-commercant`) | caisse vivante, dernières ventes rendues | ✔ |
| 29 | Encaisser (`bc-encaisser`) | montant → QR (régression parcours 1 verte) | ✔ |
| 30 | Ventes du jour (`bc-ventes`) | sheet → Rembourser : 148 500 → 144 000 | ✔ |
| 31 | Code du comptoir (`bc-code`) | QR fixe, imprimer/partager | ✔ |
| 32 | Vider la caisse (`bc-retrait`) | prérempli à la caisse, clôture livre caisse, retour boutique | ✔ |
| 33 | Fin de journée (`bc-cloture`) | récap net, journée close animée, rouvrir | ✔ |
| 34 | Hub PME (`b-pme`) | trésorerie, tuiles synchronisées | ✔ |
| 35 | Salaires (`pme-salaires`) | cascade N dynamique + édition au pad (total 1 180 000) | ✔ |
| 36 | Facturer (`pme-facturer`) | formulaire → aperçu n° 2026-041 | ✔ |
| 37 | Aperçu facture (`pme-apercu`) | papier → envoyer → en attente | ✔ |
| 38 | Factures (`pme-factures`) | statuts, relance, paiement client simulé | ✔ |
| 39 | Équipe (`pme-equipe`) | embauche réelle → « Payer 6 salaires » | ✔ |
| 40 | Client comptable (`cpt-client`) | Confirmer/Écarter, tout rapprocher en cascade, badge hub 4→0 | ✔ |
| 41 | Exports (`cpt-exports`) | chips à groupes, « Mois · CSV » prêt | ✔ |
| 42 | Hub e-commerce (`b-ecommerce`) | encaissé du jour vivant | ✔ |
| 43 | Lien de paiement (`ec-lien`) | lien+QR → payé → commande créée | ✔ |
| 44 | Commandes (`ec-commandes`) | sheet → remboursement (total redescendu) | ✔ |
| 45 | Checkout (`ec-checkout`) | déplacé sous le hub, confirmé | ✔ |
| 46 | Appareils (`appareils`) | déconnecter → compteur profil 2→1 | ✔ |

Flow transversal : « Se déconnecter » → splash ; remboursement unifié par
`data-remb` (caisse / e-commerce) dans la sheet.

## Journal des boucles (2)

### Lot F — commerçant (verdict : vert après 3 corrections d'œil)
- Hub-terminal + 5 sous-écrans ; ventes rendues depuis les données ;
  remboursement via la sheet générique (`data-remb`) ; clôture générique
  étendue (`livre: "caisse"`, `retour`) ; hooks d'entrée d'écran (`vaHooks`).
- Attrapé à l'œil : montant de caisse atténué par la règle des décimales
  (`span` nu dans `.montant`), « 23 » volant l'accent acide, classe `.sect`
  inexistante (titre brut souligné). Trois corrections, re-sonde verte.
### Lot G — PME
- Équipe/factures en données rendues ; édition de salaire par sheet au pad ;
  embauche qui recalcule cascade et totaux ; facture → aperçu papier → envoi.
- Désamorcé un bug latent : le handler des chips d'Activité ciblait toutes
  les `.chip` du document — scopé, + handler générique à groupes.
### Lots H+I — comptable, e-commerce, appareils
- Rapprochements Confirmer/Écarter + cascade « tout rapprocher » synchronisée
  au badge du hub ; exports par chips ; e-commerce restructuré en boutique
  vivante (lien de paiement → commande, remboursement partagé `data-remb`) ;
  appareils déconnectables.
### Boucle finale (2)
- `sonde-parcours2` : 22 assertions par clics réels → **22/22 PASS**.
- Régression parcours 1 : 24/25 — la sonde comptait les coches dans
  l'ancien conteneur `#pme-liste` (remplacé par `#sal-liste`) : sonde mise
  à jour, **25/25**. Total : **47/47**. `sonde-app` : 43 écrans, 0 cible
  cassée, 0 orphelin, 0 débord 390/1280.

### Correctifs post-livraison (retour commanditaire, 2 screenshots)
- Coche « Paiement reçu » décentrée : les états internes de `b-qr`/`bc-cloture`
  sont des wrappers en flux bloc — la scène gagnait le bord gauche. Fix :
  `.scene { margin-inline: auto }`. Mesuré : centres scène/titre identiques.
- Avatar du Profil aux initiales en haut-gauche + nom en sourd : la règle
  `.profil-tete span { display: block; color: sourd }` (0-1-1) écrasait le
  `display: grid` de `.avatar` (0-1-0). Fix : wrapper classé `.pt-txt`,
  règles scopées. Les autres `span` stylés du fichier vérifiés : tous scopés.
- Bande verdâtre en haut du Profil (screenshot) : non reproduite en local à
  1218 px — vient de la page publiée ou de l'hôte ; défense posée :
  `html { background: #0B0C0E }` (plus aucune transparence au-dessus du body).

---

# BOUCLE 3 — l'intelligence des mondes (retour commanditaire, 2026-08-28)

## La critique (résumée, point par point)

1. Commerçant : « Vider » → « Retirer » ; + fonctionnalité SCAN : encaisser
   directement un compte SwimPay en scannant le QR du client.
2. PME : la constitution d'équipes n'existe pas — apporter un outil qui se
   pose sur les habitudes (absorber un CSV) ; aucun flow d'alimentation du
   solde ; il manque l'ENVOI tracé depuis le compte de l'entreprise ;
   « Atelier Mode » incompréhensible → « Mon entreprise ».
3. Comptable : aucune action concrète — que FAIT l'outil ?
4. E-commerce : il manque l'intégration développeur (SDK, clés, webhook).

## Backlog Boucle 3

ÉTAT FINAL : 11/11 vérifiés — 50 écrans, 65/65 assertions (18 nouvelles + régressions 25 + 22).

| # | livrable | vérifié par clics réels | sondé |
|---|---|---|---|
| 47 | `bc-scan` + `bc-client` | client vérifié → encaissé : caisse +3 500, vente « Encaissement direct » en tête | ✔ |
| 48 | Renommage Retirer | action, écran, CTA, clôture « Retrait effectué » (sonde 2 mise à jour) | ✔ |
| 49 | `pme-import` | VRAI parseur (FileReader ; séparateur auto ; entêtes nom/rôle/salaire/équipe ; échappement) → 4 lignes → fusion : 9 employés | ✔ |
| 50 | Équipes nommées | équipe groupée ; chips de filtre ; « Payer 4 salaires (Production) » = 930 000 ; cascade filtrée | ✔ |
| 51 | `pme-depot` | 2 sources à coche ; « +500 000 » crédité en acide ; trésorerie 4 930 000 | ✔ |
| 52 | `pme-envoyer` | motif « Facture F-889 » jusque dans le reçu ; trésorerie 4 430 000 ; Terminé → entreprise | ✔ |
| 53 | Trésorerie vivante | salaires −930 000 → 4 000 000 ; facture payée +380 000 → 4 380 000 ; activité en tête | ✔ |
| 54 | « Mon entreprise » | hub, badge salaires, papier de facture ; client comptable renommé « Atelier Couture » | ✔ |
| 55 | Comptable actionnable | barre Rapprocher/Exporter/Inviter ; « Demander la pièce » sur écartée → « Demande envoyée » ; carte « Ce que l'outil fait seul » | ✔ |
| 56 | `cpt-inviter` | QR + lien cabinet, copier/envoyer | ✔ |
| 57 | `ec-integration` | clé copiable/régénérable, snippet SDK, webhook test → 200 OK, mode test | ✔ |

## Journal (3)

- Construit en un lot (F′) ; `cloture()` étendue aux livres `pme-debit`/
  `pme-credit` + `credit` (montant acide préfixé « + ») ; `encaisse()`
  factorisé (QR affiché et scan direct partagent la conclusion) ;
  champs issus du CSV échappés avant `innerHTML`.
- Incident en cours d'édition : un Edit maladroit a laissé une IIFE
  parasite non fermée dans `cloture()` — vu et retiré immédiatement,
  la zone relue avant sonde.
- `sonde-parcours3` : **18/18**. Régressions : parcours 1 **25/25**,
  parcours 2 **22/22** (titre « Retrait effectué » mis à jour).
  `sonde-app` : **50 écrans**, 0 cible cassée, 0 orphelin, 0 débord.

---

# BOUCLE 3-bis — la chaîne de l'algorithme (retour commanditaire)

## La critique

1. « Motif — il suit l'argent, jusqu'au reçu » : expression jamais demandée.
   Diagnostic élargi : des slogans posés dans des zones fonctionnelles.
2. Sur Envoyer : il manque les moyens d'envoi (mobile money / banque) AVANT
   d'arriver à l'envoi — les itérations ne suivaient pas le schéma de
   l'algorithme (le Cerveau V1), la chaîne logique n'était pas déroulée.

## Règle ajoutée à la DoD (permanente)

> **Chaque flow met en scène son module du Cerveau, dans l'ordre du schéma :**
> l'**Annuaire** résout le destinataire (identité vérifiée, ses comptes) ;
> le **Routeur** propose le moyen (mobile money / banque) avec délai et
> frais AVANT le montant ; le **Rapprocheur** nourrit activité et console ;
> le **Moteur de factures** porte la facturation. Un écran qui saute une
> étape de la chaîne est un échec de boucle, pas un détail.
> **Et : zones fonctionnelles = libellés sobres ; le ton n'est admis que
> sur l'onboarding.**

## Corrections livrées (20/20 + régressions 25/25 et 22/22 = 67/67)

- `pme-envoyer` refondu : Destinataire → **Moyen de réception** (Mobile
  money A/B immédiat, Banque sous 3 h, sélection à coche) → Motif (label
  sobre) → montant → **récap de routage vivant** (« Par … · délai ·
  Frais — aucun ») ; la clôture porte le moyen choisi.
- `envoyer` (Personnel) : même chaîne — Awa K. « Identité vérifiée · un
  seul compte » (Annuaire), carte « Elle reçoit sur » (mobile money /
  banque), récap de routage sous le solde, clôture avec le moyen.
- Passe anti-slogan : 11 libellés ramenés au sobre (dépôt, scan, import,
  intégration, comptable, checkout) ; le pitch ne survit que sur Bienvenue.

---

# BOUCLE 3-ter — audit complet des chaînes (2026-08-28)

Le commanditaire a raison : la boucle 3-bis a déclaré « chaîne complète »
après avoir corrigé DEUX flux. Faute de méthode : une correction ponctuelle
vendue comme un état global. Cette boucle audite TOUS les mouvements
d'argent contre la chaîne canonique — origine → Annuaire (destinataire
résolu) → Routeur (moyen · délai · frais) → montant → reçu portant toute
la chaîne → grand livre.

## L'audit, flux par flux

| flux | état avant | correction |
|---|---|---|
| Envoyer perso | corrigé en 3-bis | — (récap + moyen au reçu) ✔ |
| Payer marchand | ✗ aucun Routeur | récap « Depuis mon compte ····9654 · immédiat · Frais — aucun » + reçu ✔ |
| Swap entre réseaux | ✔ déjà conforme (de/vers + récap délai/frais) | — |
| Vers la banque | ✔ déjà conforme (compte + délai) | — |
| Envoyer PME | corrigé en 3-bis | — ✔ |
| Dépôt PME | ✗ récap statique | récap dynamique lié à la source (banque = 3 h, mobile = immédiat) ✔ |
| Salaires PME | ✗ moyen de réception absent | chaque employé porte son moyen (mobile money / banque) dans la liste ; import et embauche en génèrent un ; récap au CTA ✔ |
| Retrait commerçant | ✗ récap flou | « Vers Banque ····2201 · sous 3 heures · Frais — aucun » ✔ |
| Encaisser (QR affiché) | ✗ rail d'entrée invisible | attente : « Tous les réseaux acceptés · crédit immédiat » ; reçu : source paramétrée (« Payé par mobile money · immédiat ») ✔ |
| Scan client | ✗ compte prélevé non montré | récap « Depuis son compte SwimPay ····3417 · immédiat » + reçu avec la source ✔ |
| Checkout e-commerce | ✗ chaîne du push muette | « La demande arrive dans ton app — tu choisis le compte au moment de payer » + récap ✔ |
| Recevoir / Demander / Reçus | n/a (pas un envoi) | — |

## Verdict

- 8 assertions de chaîne ajoutées à la sonde 3 : **26/26** ; régressions
  **25/25** et **22/22** — **73/73** ; 50 écrans, 0 cible cassée,
  0 orphelin, 0 débord.
- Leçon de méthode ajoutée : **une correction ne se déclare jamais au
  périmètre supérieur à celui qui a été sondé.** L'audit exhaustif
  précède la déclaration, pas l'inverse.

## Leçons payées (reportées à la skill si récurrentes)
- Page autonome sans `<meta name="viewport">` → un vrai téléphone rend à
  980 px. Les captures headless (fenêtre clampée ~512) le masquent ;
  seule l'émulation CDP le montre.
- Un événement clavier synthétique doit être `bubbles: true` pour
  éprouver un listener `window`.
- Les transitions JS se déclarent (`data-mene`) pour que le graphe de
  flows reste vérifiable mécaniquement.
