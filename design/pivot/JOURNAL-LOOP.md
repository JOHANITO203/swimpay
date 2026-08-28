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

---

# BOUCLE 4 — le réseau écrit d'abord, puis complété (2026-08-28)

## La consigne

> série de boucles : écrire le RÉSEAU NEURONAL COMPLET du cerveau, puis
> tout ce qui est nécessaire pour l'UI, construire, vérifier toute la
> chaîne de logique et de flow, toutes les pièces manquantes, et ne
> présenter qu'une fois sûr de n'avoir rien oublié.
> Chaque profil business a besoin d'un panneau compte/paramètres.

## Méthode appliquée (nouvelle, permanente)

1. **`RESEAU-CERVEAU.md` écrit AVANT de construire** : modules → écrans,
   chaîne canonique, nœuds/arêtes/états/panneau par profil, pont Annuaire,
   checklist de complétude, trous assumés.
2. Diff réseau ↔ app = backlog. 3. Construction. 4. Sondes. 5. Présentation.

## Construit dans cette boucle (17/17 + régressions 25+22+26 = 90/90)

- **4 panneaux paramètres** atteignables par engrenage depuis chaque hub :
  - `bc-params` Boutique : identité (gérante vérifiée, compte de retrait),
    PERSONNEL AUTORISÉ à encaisser (liste + ajout réel), préférences.
  - `pme-params` Entreprise : NOM ÉDITABLE qui se propage partout (hub,
    badge, papier de facture, « Mes profils » du perso), n° RC, compte lié,
    RÔLES & ACCÈS (gérante, comptable révocable, double validation à seuil),
    facturation (préfixe, échéance).
  - `cpt-params` Cabinet : membres (ajout réel), clients connectés
    (révoquer), exports par défaut.
  - `ec-params` Boutique en ligne : domaine autorisé, lien Clés & SDK,
    reversement (compte + fréquence), notifications.
- **Factures lisibles** (pièce demandée en boucle 3 et oubliée — nommé) :
  toucher une facture l'ouvre dans l'aperçu papier avec son numéro,
  Imprimer / Télécharger / Partager, Relancer si non payée ; le mode
  création est restauré ensuite.
- **Pont Annuaire** : le Profil personnel liste « Mes profils » (Kiosque 12,
  l'entreprise renommée en direct, Maison Kéma) ; chaque panneau nomme sa
  gérante vérifiée.
- Une infraction anti-slogan attrapée à l'œil sur le nouveau panneau
  (« — il se propage partout ») : retirée.

## État : 54 écrans · 90/90 assertions · 0 cible cassée · 0 orphelin · 0 débord

---

# BOUCLE 5 — le cycle de l'argent du client + les rails nommés (2026-08-28)

## La critique

1. Le Personnel n'a aucun moyen de réapprovisionner son compte SwimPay
   (mobile money ou banque → compte SwimPay).
2. Le widget Transférer doit envoyer depuis le compte SwimPay vers TOUS
   les mobile money et vers SwimPay.
3. Utiliser les VRAIS noms du paysage ivoirien.

## Livré (11/11 + régressions 25+22+26+17 = 101/101)

- **`recharger`** (chip acide sur la carte de solde) : Orange Money /
  Wave / Banque → compte SwimPay ····9654 ; récap Routeur dynamique ;
  clôture « Compte rechargé » créditée en acide ; le SOLDE MONTE
  (+100 000 vérifié), rangée d'entrée en tête d'activité et d'accueil,
  tuile Entrées recalculée, solde propagé partout (widget compris).
- **`swap` refondu en widget Transférer** : depuis Mon compte SwimPay →
  grille des rails **Orange Money · MTN MoMo · Moov Money · Wave ·
  Compte SwimPay · Banque** (pastilles aux couleurs des marques),
  numéro du destinataire, récap Routeur, clôture avec rail + numéro.
  L'ancien swap A↔B disparaît (couvert par recharger + transférer).
- **Noms réels partout** : envoyer perso (Wave/Banque), envoi PME
  (Orange Money/Wave/Banque), dépôt (Orange Money du gérant), moyens de
  réception des salaires (les 4 réseaux en rotation à l'embauche et à
  l'import), source des encaissements commerçants (rotation des 4).
- `RESEAU-CERVEAU.md` § 2 bis : la décision des rails nommés + le cycle
  recharge → circulation → réception.

## Échec instructif de la boucle

3 FAIL en régression sonde 3 → diagnostic direct : l'app était correcte,
les ASSERTIONS étaient périmées par les renommages (« Mobile du gérant »
→ « Orange Money du gérant »…). Sondes alignées → 26/26. La distinction
sonde-menteuse / code-cassé a été faite par MESURE, pas par confiance.

## État : 55 écrans · 101/101 · 0 cassée · 0 orphelin · 0 débord

---

# BOUCLE 5-bis — « Vers MA banque », plusieurs banques (2026-08-28)

Retour commanditaire : le mobile→banque du Personnel vise SA banque
(« Vers ma banque ») et un utilisateur peut avoir PLUSIEURS banques.

## Livré (16/16 + régressions 25+22+26+17 = 106/106)

- `banque` refondu en **« Vers ma banque »** : MES banques listées
  (Ecobank ····9102, NSIA Banque ····2201 — identité Camille Laurent),
  sélection à coche, récap Routeur qui suit la banque, clôture avec la
  banque choisie.
- **+ Ajouter une banque** (nom + 4 chiffres) : la banque s'ajoute,
  se sélectionne, ET devient une **source de Recharge** — un seul état
  `mesBanques` rendu aux deux écrans (l'Annuaire en acte).
- Réseau maj : Annuaire = N banques par personne, même identité.
- Deux défauts attrapés à l'œil : formulaire d'ajout visible malgré
  `hidden` (le `display: flex` inline écrase l'attribut — corrigé par
  `#mb-form:not([hidden])`), placeholders tronqués.
- Leçon de sonde payée : un `replace` python silencieux a laissé la
  sonde 5 SANS les assertions banques (11/11 trompeur) — vu au compteur,
  repatché en fichier .py avec `assert`. Règle : tout patch de sonde
  s'assert, et le compteur attendu se vérifie.

## État : 55 écrans · 106/106 · 0 cassée · 0 orphelin · 0 débord

---

# BOUCLE 6 — retirer élargi, envoi PME complet, le cash clarifié (2026-08-28)

## Les trois retours

1. Retirer (commerçant) : élargir — pas seulement vers la banque, aussi
   vers les mobile money (confirmé en cours de boucle par le commanditaire).
2. Envoyer (PME) : limité à deux mobile money — compléter.
3. Facturer (PME) : pas assez clair — ce qu'on ne facture PAS
   automatiquement, ce sont les ventes en espèces, saisies pour la compta.

## Livré (11/11 + régressions 25+22+26+17+16 = 117/117)

- **Retirer** : trois destinations à coche — Banque ····2201 (sous 3 h),
  Orange Money du gérant ····07 88 (immédiat), Wave du gérant ····12 44
  (immédiat) ; récap Routeur suit la destination ; clôture la porte.
- **Envoyer PME** : grille des 6 rails (Orange Money · MTN MoMo · Moov
  Money · Wave · Compte SwimPay · Banque, pastilles de marques) + champ
  numéro du destinataire ; la clôture porte rail + numéro + motif.
- **Facturer clarifié** : bandeau « Les paiements SwimPay se facturent
  tout seuls. Ici : une facture à encaisser, ou une vente en espèces à
  enregistrer. » ; choix **À encaisser / Payée en espèces** ; l'aperçu
  et le CTA s'adaptent (« Enregistrer la vente », mentions espèces) ;
  la facture espèces entre en statut « Payée · espèces », SANS toucher
  la trésorerie SwimPay ni le total en attente (l'argent est en caisse
  physique — c'est une écriture comptable), pas de relance en lecture.
- 1 sonde périmée détectée en régression (libellé PME sans numéro) —
  alignée après vérification que l'app était juste.

## État : 55 écrans · 117/117 · 0 cassée · 0 orphelin · 0 débord

---

# BOUCLE 7 — l'e-commerçant déplace son argent librement (2026-08-28)

## Le retour

L'e-commerçant doit pouvoir déplacer l'argent encaissé sur son compte
SwimPay comme bon lui semble : il manquait le RETRAIT vers mobile money
et banques.

## Livré (sonde 6 étendue : 16/16 ; total régressions = 122/122)

- **`ec-retrait`** (action « Retirer » sur le hub, à la place du raccourci
  Checkout — le checkout reste accessible par la chip de la carte) :
  montant prérempli à l'encaissé disponible, destinations à coche —
  Banque ····8812 (reversement · sous 3 h), Orange Money du gérant
  ····07 88 (immédiat), Wave du gérant ····12 44 (immédiat) — récap
  Routeur, clôture « Retrait effectué » avec la destination, encaissé
  débité (86 000 → 0 vérifié), retour boutique.
- Clôture générique : nouveau livre `ecom`.

## Leçon d'outillage (payée deux fois, close)

Les patchs de sonde passés en heredoc dans le paramètre de commande
perdent un niveau de backslash (l'échappement JSON) : la cible
`join("\n")` devient un vrai saut de ligne et ne matche jamais —
échec SILENCIEUX. Règle définitive : les patchs s'écrivent en fichier
`.py` ET ciblent PAR LIGNES (`splitlines` + index), jamais par chaîne
contenant des séquences d'échappement ; chaque patch s'assert avant et
après.

## État : 56 écrans · 122/122 · 0 cassée · 0 orphelin · 0 débord

---

# BOUCLE 8 — les comptes liés de chaque profil (2026-08-28)

## Le retour

Ajouter à tous les profils les bindings / liaisons de comptes bancaires
et mobile money, pour faciliter la circulation.

## Livré (9/9 + régressions 25+22+26+17+16+16 = 131/131)

- **Section « Comptes liés » dans chaque panneau** (Personnel, Boutique,
  Entreprise, Cabinet, Boutique en ligne) : liste typée (pastilles de
  marques, mobile money · immédiat / banque · sous 3 heures) + formulaire
  « Lier un compte » (type en chips OM/MTN/Moov/Wave/Banque, 4 chiffres,
  nom exigé pour une banque).
- **La liaison alimente les flux** — registre unique `liaisons` par
  profil, rendu partagé : un MTN lié au Personnel apparaît dans les
  sources de Recharge ; un Moov lié à la Boutique devient une destination
  de Retrait (3→4) ; un Wave lié à l'Entreprise devient une source
  d'Approvisionnement (2→3). Vérifié par clics réels.
- rt-dest / dp-sources / er-dest / rc-sources désormais RENDUS depuis le
  registre (plus de listes en dur) — ordres et libellés préservés
  (régressions 5 et 6 vertes sans retouche).
- Défaut d'œil attrapé : les 5 chips de type ne wrappaient pas, « Banque »
  clippée hors carte (le clic de sonde passait, pas le doigt) — wrap +
  chips compactes.

## État : 56 écrans · 131/131 · 0 cassée · 0 orphelin · 0 débord

---

# AUDIT À FROID (2026-08-28) — « ce que j'ai oublié », sans complaisance

Backlog issu d'une revue contre le réseau et les docs produit. Vérifié
dans le code (jauges statiques, absence de checks) avant d'être écrit.

## Bloquant (contredit la thèse)
1. Onboarding sans KYC — le Profil dit « pièce vérifiée » jamais demandée.
2. Plafonds affichés (2M / 10M) mais appliqués NULLE PART ; jauge
   « Envois ce mois » statique.
3. PIN jamais demandé sur une opération sensible.
4. Double validation PME configurée mais jamais appliquée (feature morte).

## Important (maillons manquants de chaînes existantes)
5. Écran « demande de paiement entrante » côté Personnel absent — trois
   flux y pointent (checkout, scan commerçant, et par nature Recevoir).
6. Recevoir : seul flux d'argent sans conclusion simulable.
7. Widget Transférer : pas de résolution Annuaire du numéro saisi.
8. « Frais — aucun » sur tous les rails : faux et contraire au modèle
   (sorties externes payantes ; SwimPay↔SwimPay gratuit = l'argument).
9. La vente en espèces PME n'apparaît pas côté console comptable.

## Secondaire (narratif de démo)
10. Pas de choix de profil après l'onboarding.
11. Aucun état vide (l'onboarding débouche sur un compte rempli).
12. Notifications business inexistantes ; aucun écran d'erreur.

Statut : EN ATTENTE d'arbitrage du commanditaire (ordre / retranchements)
avant construction.

---

# BOUCLES 9-12 — l'audit déroulé (2026-08-28) : 158/158

## Boucle 9 — conformité incarnée (11/11)
- **KYC** : étape 4/5 de l'onboarding — cadre de capture, pièce lue
  (« CNI ····8842 · Camille Laurent · les noms correspondent ») ; le
  « identité vérifiée » du Profil est désormais GAGNÉ, pas décrété.
- **Plafonds appliqués** : recharge refusée au-delà de 2M de solde,
  débits refusés au-delà de 10M/mois — bandeau d'erreur qui NOMME la
  marge restante ; jauges du Profil vivantes.
- **PIN** : toute opération personnelle > 100 000 exige le code (sheet
  4 points + pad) ; en deçà, fluide.
- **Double validation PME réelle** : envoi > seuil configuré → sheet
  « deux signatures requises » → demande à N. Kader → signé → le reçu
  porte « 2 signatures ».

## Boucle 10 — la demande de paiement entrante (le maillon fantôme)
- Écran `demande-entrante` (marchand vérifié, montant, motif, récap) :
  **Payer** (plafonds + PIN → débit réel) ou **Refuser** (clôture
  « Demande refusée · aucun débit » — livre `rien`, premier écran de
  refus). Ouvert depuis une notification actionnable.
- **Recevoir se conclut** : « Simuler un paiement reçu » → crédit réel
  (plafond de solde respecté), rangée d'entrée partout.

## Boucle 11 — le Routeur signifiant
- **Frais différenciés** : sorties mobile money externes 1 %, Compte
  SwimPay gratuit (l'argument), banque 200 ; entrées (recharge, dépôt
  PME) gratuites — visibles au récap ET dans le reçu (`s-frais2`).
- **Résolution Annuaire du widget** : le numéro saisi devient un nom à
  identité vérifiée (live à la frappe).

## Boucle 12 — les boucles fermées
- La **vente en espèces** PME pousse une écriture « à rapprocher » chez
  le comptable connecté (compteur +1, validable — valide-btn passé en
  délégation pour les rangées dynamiques).
- Post-onboarding : « J'ouvre aussi un profil pour mon activité ».
- Décisions documentées au réseau : états vides = compte de démo vécu
  (un mode « compte neuf » serait un chantier à part) ; notifications
  par monde business = mécanisme démontré côté Personnel.

## État : 58 écrans · 158/158 (14 + régressions 27+22+26+17+16+16+9+11)
· 0 cassée · 0 orphelin · 0 débord

---

# BOUCLE 13 — la 2e signature est une approbation externe (2026-08-28)

## Le retour

> les signatures pour les PME seront des approbations d'un compte externe
> avec PIN ou biométrie

## Livré (sonde 9 refondue 13/13 + régressions 27+22+26+17+16+16+9+14 = 160/160)

- Le flow devient trois temps réels : (1) côté PME, la sheet dit
  « approbation d'un cosignataire requise » → **demande envoyée à
  N. Kader · en attente sur son appareil** ; (2) l'écran `approbation` —
  **la vue du cosignataire** (cadre démo assumé) : qui demande (Camille
  Laurent · l'entreprise), le montant, le destinataire + rail, le motif ;
  (3) il approuve **par biométrie** (lecture d'empreinte simulée) ou
  **par code** (la sheet PIN), ou **refuse** (« Envoi non signé · aucun
  débit — le fournisseur n'est pas payé »).
- Le reçu porte « approuvé par N. Kader (biométrie/code) » ; le débit
  n'a lieu qu'après l'approbation. Le panneau Entreprise dit le vrai
  mécanisme : « Approbation d'un cosignataire · PIN ou biométrie ».
- Sonde-app améliorée : les arêtes des sheets globales (chrome commun)
  comptent dans le graphe d'atteignabilité — `approbation` n'est pas
  orphelin, il est atteint via la sheet de l'écran actif.

## État : 59 écrans · 160/160 · 0 cassée · 0 orphelin · 0 débord

---

# BOUCLE 14 — les vrais logos sur les rails (2026-08-28)

Assets déposés par le commanditaire (Orange, MTN, Moov Africa, Wave 2K).
- Vignettes fabriquées par script (auto-crop du motif coloré, carré,
  96 px, JPEG q80 → data URI ; ~16 Ko pour les 5). Orange recadré pour
  garder le wordmark dans le rond, borné au carré de marque.
- Un registre unique `LOGOS` + `pastilleRail()` : les pastilles
  initiales (OM/MTN/MV/W/S) deviennent les vrais logos PARTOUT — rendus
  JS (TYPES_LIA en getters) et statiques (data-rail rempli au
  chargement). 26 pastilles-images, toutes chargées (naturalWidth
  vérifié).
- **Le symbole SwimPay** : sur l'origine du widget, sur le rail
  « Compte SwimPay » (pastille acide + symbole noir), et **au centre de
  chaque QR** (cartouche blanc + symbole — recevoir, code du comptoir,
  encaissement, lien e-commerce, invitation cabinet : un seul point,
  dessineQR).
- Incident de patch : les remplacements globaux mangeaient d'abord les
  pastilles DANS TYPES_LIA → l'assert a arrêté le script avant toute
  écriture ; réordonné (TYPES_LIA d'abord) et rejoué. Rien n'a été
  écrit à moitié.

## Boucle 15 — le sens de l'argent + Orange centré (retour du commanditaire)
- **« Vers », pas « Par »** : le récit produit = l'utilisateur envoie DEPUIS
  son compte SwimPay VERS les mobile money et banques. `majRoutages` écrit
  désormais « Vers X » (sorties) et « Depuis X » (conteneurs
  `data-sens="entree"` : recharge perso, dépôt PME). Les 8 récaps par
  défaut statiques audités un à un — corrigé au passage le défaut de
  `rc-sources` (une entrée qui disait « Vers … Frais — 1 % » au lieu de
  « Depuis … Frais — aucun »).
- **Vignette Orange recentrée** : l'extraction du wordmark par bbox des
  pixels blancs attrapait le bruit JPEG (bbox 74×76, quasi carrée) → le
  mot restait collé en bas. Refaite par PROJECTION : seules les lignes
  portant ≥ 12 pixels blancs comptent (le wordmark est dense, le bruit
  épars) ; ratio contrôlé par assert (> 2,5, obtenu 4,56) ; mot recollé
  centré à 72 % sur fond orange uni. Preuve d'octets de bout en bout
  (le fichier relu == l'URI générée) + preuve visuelle (capture #swap).
- Incident : DEUX régénérations précédentes semblaient réussies (aperçu
  centré) mais le fichier portait toujours l'ancienne vignette — heredoc
  → règle re-payée : les patchs Python vivent dans des fichiers `.py`,
  et la vérification se fait sur LE FICHIER relu, jamais sur l'aperçu
  en mémoire.

## Boucle 16 — choisir qui reçoit (demande du commanditaire)

Deux demandes : (a) sur Envoyer perso, le bouton « Changer » doit mener aux
contacts ET permettre un numéro hors liste ; (b) les retraits business et
l'envoi PME doivent viser aussi des comptes **qui ne sont pas les siens**.

- **`destinataire`** (perso) : recherche nom/numéro, 5 contacts avec le
  nombre de comptes rattachés, saisie libre. Le contact choisi **repeuple
  la liste « reçoit sur »** avec ses propres comptes — l'Annuaire commande
  le Routeur, il ne le décore pas. Hors Annuaire : identité non garantie,
  4 rails mobile money à désigner, numéro gardé au carnet.
- **`destination`** (business) : mes comptes liés · bénéficiaires
  enregistrés · autre compte (rail, titulaire, numéro, Annuaire, option
  « enregistrer comme bénéficiaire »). Un seul écran sert les trois flux
  (bc-retrait, ec-retrait, pme-envoyer) via `ctxDest` ; le retour rend au
  flux appelant avec la destination déjà sélectionnée.
- Effets vrais : le reçu et le grand livre nomment le destinataire réel ;
  les rangées de réception passent au rendu unifié, donc aux vrais logos.
- Sonde : **parcours 11, 31/31**, régressions 160/160 inchangées,
  structure 61 écrans / 0 cassée / 0 orphelin / 0 débord.

### Trois pannes, trois causes distinctes
1. `const initiales` existait déjà → j'ai monté `initiales` ET `ech` en
   tête du script (ils servaient avant leur déclaration : `ech` aurait
   levé une TDZ au premier appel de `resoudNumero`).
2. `COCHE_MINI` existait déjà (coche acide des listes) → collision de
   déclaration, script entier mort (`va is not defined`). Diagnostic par
   `Runtime.exceptionThrown` (sonde `erreur.mjs`, à garder) : la sonde de
   structure ne disait que le symptôme, jamais la cause.
3. **La sonde mentait** : `/\s+/` écrit dans un template literal JS devient
   `/s+/` — elle découpait les cibles sur la lettre « s » (« destinataire »
   → « de » + « tinataire »). Règle : dans le code envoyé par CDP, pas
   d'échappement regex ; ici `.split(" ")`.

## Boucle 17 — ce qu'une démo native nous apprend (étude vidéo)

Le commanditaire a fourni une démo Flutter fintech à étudier. Constat franc :
**référence de design, pas d'animation** — changer d'onglet n'y anime rien
(`IndexedStack`), une seule vraie transition dans 5 minutes, aucune entrée
de contenu animée. Quatre points retenus, appliqués à tous les layouts.

1. **La profondeur s'anime, le latéral non.** `va()` pousse l'écran entrant
   depuis la droite (300 ms, `cubic-bezier(.22,.92,.26,1)`) pendant que le
   sortant glisse de −17 % et s'assombrit — la parallaxe. Ne s'applique
   qu'aux écrans de FLUX (`.shell.flux`) ; onglets et hubs basculent sec,
   comme dans la référence. Mesuré au rendu, animation figée : entrant à
   68 % du chemin à 60 ms, 92 % à 120 ms, 99 % à 220 ms ; sortant à −66 px.
   La référence faisait 83 % à 100 ms — même famille de courbe.
   Retour = pousse inverse. `prefers-reduced-motion` coupe tout.
   Pile de navigation : **toute cible déjà traversée est un retour**, même
   de plusieurs crans (sortir d'un reçu ramène à l'accueil en tirant).
2. **Le rail d'avatars** (contacts fréquents) sur l'accueil — « Envoyer à »,
   un visage ouvre l'envoi déjà adressé — et sur Destinataire, au-dessus de
   la liste complète. Reconnaître va plus vite que lire.
3. **La recherche porte son action** : loupe intégrée + bouton de scan QR
   dans le même bloc, comme la référence. Le scan mène au scanner existant.
4. **« Où part l'argent »** : la répartition des sorties, **calculée sur les
   rangées réelles du grand livre** (13 200 + 12 500 + 5 000 = 30 700, la
   tuile Sorties au-dessus). Barre pondérée + rangées motif · part · montant,
   cliquables pour filtrer le livre, et combinables avec les chips.
   Écart assumé avec la référence : elle utilise quatre teintes ; nous
   gardons **un seul accent dégradé par rang** — la direction prime.

Non retenu, et pourquoi : leurs montants sont en chiffres proportionnels
(colonnes non alignées — nous restons en tabulaire) ; leurs pourcentages
écrits sur les arcs à ~10 px sont illisibles ; leurs avatars arrivent en
retard (ronds vides ~1 s). Le sélecteur à pilule pleine était déjà notre
`.chip.actif` — rien à changer.

Outils : `capture-transit.mjs` fige l'animation à un instant donné
(`animation-play-state: paused` + `animation-delay` négatif) — le temps
virtuel de CDP, lui, ne fige PAS les animations CSS (première tentative
ratée). `erreur.mjs` remonte les exceptions de la page.

## Boucle 18 — le bureau cesse d'être un téléphone agrandi

Consigne : garder le rendu téléphone tel quel, convertir les écrans de
bureau qui présentent une UI mobile. Mesure d'entrée : à 1440 px,
**41 écrans sur 61 occupaient 430 px**, une colonne au milieu du vide.

**Le mécanisme.** `composeBureau()` lit ce que chaque écran de flux
contient et lui attribue un mode, puis range ses enfants dans des volets.
Ces volets sont en `display: contents` en dessous de 881 px : ils
n'existent pas pour la mise en page mobile. **Tout le CSS de bureau est
enfermé dans `@media (min-width: 881px)`.**

**Les quatre modes** (39 écrans de flux) :
- `duo` (12) — flux d'argent : les choix à gauche, un **panneau d'action
  collant de 400 px** à droite (montant, récap, CTA). Le pavé numérique
  disparaît : sur bureau **on tape au clavier**, avec l'invite qui le dit.
  Le classement se fait par TYPE et non par position — Envoyer écrit son
  montant en tête, Retirer en bas, les deux se composent pareil.
- `hub` (3) — mondes business : caisse et actions à gauche (380 px), le
  journal des opérations à droite.
- `listes` (2) — Destinataire, Destination : les sections deviennent des
  blocs qui **coulent en deux colonnes CSS**. Première tentative en
  grille : deux blocs d'une même ligne se règlent sur le plus haut et
  laissent un trou — vu au rendu, corrigé en `columns: 2`.
- `focus` (22) — tâche unique : un **panneau encadré centré** (≈555 px)
  au milieu de l'écran, et non une colonne nue collée en haut.

**Preuve que le téléphone n'a pas bougé** : captures 390 px d'avant et
d'après comparées **pixel à pixel** — accueil, destinataire, activité :
`IDENTIQUE`, 0 pixel d'écart. Plus les 213 assertions à 390 px.

### Le piège de cascade, encore
`.ecran[data-bureau="focus"] { display: flex }` a la MÊME spécificité que
`.ecran[hidden] { display: none }` et arrive plus loin dans la feuille :
tous les écrans focalisés s'affichaient en même temps. La capture l'a
montré (trois écrans différents rendaient la même image), pas la sonde.
Corrigé par `:not([hidden])`. Rappel : une règle qui rallume un
`display` doit toujours s'exclure de l'état caché.

## Boucle 19 — la palette du commanditaire, en schéma et en dégradés

Palette fournie : `#141414` `#434343` `#FFFFFF` `#A2FF01`. Trois neutres
**purs** et un acide — nos gris étaient bleutés (`#15171C`, `#8B909B`).

**L'échelle**, dérivée des quatre couleurs et non posée à côté :
`--fond #141414` · `--surface #1C1C1C` · `--surface-2 #242424` ·
`--trait #2E2E2E` · `--trait-fort #434343` · `--encre #FFFFFF` ·
`--acide #A2FF01`.
`--sourd` est le seul jeton **dérivé** : `#434343` en texte sur `#141414`
donne 1,9:1 — illisible. Mesuré, remonté à `#909090` (4,86:1 au pire cas).

**Les dégradés** se construisent depuis la palette :
`--grad-acide` (A2FF01→7ACC00) sur l'action principale, le bouton primaire
et le FAB ; `--grad-surface` sur la carte de solde ; `--grad-carte`
(434343→141414) sur la carte bancaire ; `--grad-metal` (FFFFFF→434343)
sur la puce et la pastille du compte — **l'or a disparu**, la puce est
un métal neutre, la palette n'en avait pas.

**Une exception, assumée et dite** : le rouge `#E5484D` reste. C'est une
couleur SÉMANTIQUE (en retard, refuser, danger) : la supprimer rendrait
un impayé indistinguable d'une ligne normale. Seule couleur hors palette.

**Contraste mesuré, pas supposé** : 32 combinaisons texte/fond sur sept
écrans, aucune sous le seuil. Le plus faible : 4,86:1.

### Deux mensonges de sonde, deux vraies leçons
1. La sonde de contraste annonçait un échec 1:1 sur le CTA. Faux : un
   fond en **dégradé** n'a pas de `backgroundColor`, elle remontait au
   parent. Corrigée pour lire les dégradés et prendre leur teinte la plus
   sombre (le pire cas).
2. Elle cherchait les couleurs résiduelles dans `styleSheets[0]` — qui
   est la feuille des **polices**. Corrigée pour parcourir toutes les
   feuilles avec try/catch.

### Le défaut que la boucle 18 avait laissé passer
Ranger les enfants dans des volets déplace le DOM — donc l'ordre AFFICHÉ
sur téléphone, où les volets sont transparents. Sur `envoyer`, le montant
était passé **sous** les cartes. Mon diff pixel de la boucle 18 ne
couvrait aucun écran `duo` : angle mort. Corrigé en donnant à chaque
enfant son rang d'origine en `order`, et **sonde-ordre.mjs** mesure
désormais l'ordre affiché aux positions verticales réelles sur les
15 écrans à volets.

## Boucles 20-22 — l'intelligence des mondes business, les plans, Apple

Demande : comparer le cerveau aux écrans, prédire les flows par module,
raccourcir ce qui prend du temps, remplir les hubs business, retirer les
traits du fond, chercher des composants, intégrer les plans payants,
appliquer les règles Apple.

**L'audit d'abord** (voir RESEAU-CERVEAU §4 ter/quater). Les 41 nœuds du
cerveau existent tous : aucun trou de structure. Le trou est de DENSITÉ,
mesuré : un hub business portait 1 carte, 3 rangées, 437-508 px et zéro
graphe, contre 2 cartes, 7 rangées, 880 px pour l'accueil perso.
Et les plans payants n'étaient nulle part — ni dans l'app, ni au cerveau.

**Les widgets** (hubs à 762-909 px désormais). Règle tenue : chacun est
calculé sur l'état réel, rien d'inventé.
- Commerçant : rythme horaire des encaissements · ticket moyen
  (caisse ÷ paiements) · frais évités (1 % de l'encaissé) · **écart de
  caisse** — on saisit les espèces du tiroir, l'écart s'affiche.
- PME : **couverture des salaires** (trésorerie ÷ masse) · encours clients
  avec la part en retard · **calendrier d'échéances** en semaines.
- E-commerce : rythme des commandes · panier moyen · à reverser · état.
- Comptable : anneau d'auto-rapprochement · charge du mois · par client.

**Les raccourcis.**
- **Refaire** : depuis toute rangée du grand livre, l'envoi rouvre déjà
  rempli — destinataire et montant repris. Cinq gestes deviennent un.
- **Le Routeur conseille** : le rail le moins cher porte un badge. Un seul
  conseil : le délai est déjà écrit, le répéter serait du bruit.
- **La relance de facture** avait un bouton sans rien derrière. Elle a
  maintenant son flow : le Moteur écrit le message, on le corrige, on
  l'envoie, la facture est marquée.

**Les plans payants** — cinq offres (perso, commerçant, PME, e-commerce,
cabinet), deux paliers chacune. Ce n'est pas une page de vente : le plan
est un ÉTAT, et **le tarif que le Routeur annonce en dépend** (1 % → 0,5 %
sur les rails mobile money), profil par profil. C'est le point où l'offre
touche le produit.

**La veille open source** (agent séparé). Conclusion honnête : presque
tout est inutile pour nous. Retenu, sans une seule dépendance :
`Intl.NumberFormat('fr-CI', {notation:'compact'})` pour les grands
chiffres (natif, connaît déjà le franc CFA) ; le `conic-gradient` masqué
au centre pour les anneaux (plus court qu'un SVG) ; la grille en semaines
(`grid-auto-flow: column`, 7 lignes) pour le calendrier. Écartés et
pourquoi : ApexCharts (500 Ko), cal-heatmap (dépend de D3), Pikaday et
odometer (archivés), uPlot (51 Ko illisibles). `tofsjonas/sortable`
(1,7 Ko, domaine public) est bon mais exige des `<table>` — nos listes
sont des rangées, le coût de restructuration dépasse le gain.

**Règles Apple, mesurées puis corrigées.** Avant : 12 familles de
commandes sous 44×44 (dont 58 boutons ronds à 40 px), un texte à 9 px,
un écran sans retour. La cible s'étend par pseudo-élément — **le dessin
validé ne bouge pas**, seule la zone du doigt grandit. Après : 0, 0, 0.

**Les traits verticaux du fond** ont disparu.

### Trois pièges payés
1. `typeof` sur un `const` en zone morte **lève** une erreur (contrairement
   à une variable non déclarée) : le garde `typeof x === "function"` a tué
   le chargement. Passage par un porteur mutable déclaré en amont.
2. Le badge de conseil posé dans le `<b>` du rail polluait le NOM du
   compte — six sondes en échec, et surtout un nom faux pour un lecteur
   d'écran. Déplacé dans la sous-ligne.
3. `-replace` PowerShell a **corrompu les accents** d'une sonde (mojibake).
   Le piège était consigné dans mes instructions ; je l'ai fait quand même.
   Réparé par table en Python. Règle re-notée : réécrire le fichier, ne
   jamais patcher du texte accentué en PowerShell.

## Boucle 23 — la paie : du tableur de l'entreprise à de nouveaux comptes

Demande du commanditaire : le calendrier PME doit programmer les salaires
depuis une liste d'employés, proposer de sécuriser la somme dans un
**coffre** pour la date prévue, s'exécuter tout seul à l'heure dite ; le
parseur doit avaler les formats réels d'entreprise et en tirer les
**routes** ; et l'import doit lancer les invitations, avec une file qui
se synchronise — les patrons recrutent nos utilisateurs.

**Le parseur.** CSV, TSV et **XLSX réel** : un XLSX est un ZIP de XML, et
`DecompressionStream("deflate-raw")` existe nativement dans le navigateur
— vérifié avant d'écrire une ligne. Lecture par le répertoire central du
ZIP (les tailles y sont toujours justes), puis `sharedStrings.xml` et la
feuille. Le `.xls` binaire d'avant 2007 n'est pas lisible ainsi : l'app
le dit et demande un .xlsx ou un .csv, au lieu d'échouer en silence.
Huit colonnes reconnues dans n'importe quel ordre, guillemets gérés.

**Les routes, et leur cohérence.** `moyenAuto()` INVENTAIT un moyen de
paiement : supprimé. C'est l'Annuaire qui tranche — prêt (compte SwimPay,
gratuit), route externe (au tarif du rail), **conflit d'identité** quand
le numéro appartient à quelqu'un d'autre, ou à compléter. Une ligne en
conflit ne part pas : on ne paie pas sur un doute.

**La file d'installation.** Le coût des routes externes est chiffré à
l'écran ; chaque installation en retire une part. Le chef d'entreprise
envoie les liens, la file se synchronise.

**Le coffre.** La somme quitte la trésorerie disponible sans quitter
l'entreprise, réservée pour une date. Les fonds étant déjà chez nous,
**les frais de rail sont offerts** — c'est là que la custody devient un
argument concret. L'exécution à l'échéance vide le coffre et paie.

**Sonde parcours 15 : 25/25.**

### Quatre défauts trouvés en déroulant pour de vrai
1. **« MTN MoMo » partait chez Orange** : la chaîne « MoMo » contient les
   lettres « om ». Reconnaissance refaite par mots entiers, marques
   d'abord. Un opérateur ne se devine pas sur un fragment.
2. **Marquer quelqu'un « invité » écrasait sa route.** Conséquence : un
   employé dont on ignore l'opérateur devenait facturable ET payable.
   Corrigé en séparant les deux — l'invitation marque la personne, la
   route reste la route.
3. **Le coffre débitait deux fois** : à la main puis par le grand livre.
   Une réservation déplace, elle ne dépense pas.
4. **Le total incluait les lignes impayables.** Il ne compte plus que les
   routes valides, et l'écran annonce combien restent à corriger.

Et une leçon de méthode : les sondes 3 et 13 écrivaient des montants **en
dur** (4 000 000, 4 380 000). Agrandir le fichier d'exemple les a cassées
sans qu'aucune ne soit fausse. Réécrites pour **calculer** l'attendu à
partir de l'état — une sonde doit vérifier une règle, pas mémoriser un
chiffre.

## Boucle 24 — les libellés de boutons cassés sur téléphone

Le commanditaire signale « Inviter un client » découpé sur trois lignes
dans la console comptable. Sonde écrite pour chercher le défaut PARTOUT
plutôt que corriger le cas montré : **sept** boutons cassaient à 390 px
(file d'installation, recevoir, code du comptoir, comptable, intégration,
approbation).

Cause unique : `.sheet-actions .btn { flex: 1 }` — soit `1 1 0%`, qui
autorise à rétrécir un bouton **sous la largeur de son texte**. Le mot se
coupait au lieu que la rangée passe à la ligne.

Correction : `flex: 1 1 auto` + `min-width: fit-content` sur les boutons,
`flex-wrap: wrap` sur la rangée. Les boutons se partagent la largeur à
égalité tant que les libellés tiennent, et passent à la ligne sinon — le
bureau garde ses trois boutons alignés, le téléphone en met deux puis un.
Après : **zéro libellé cassé**. `sonde-boutons.mjs` garde la règle.

## Boucle 25 — le hero deux tons (référence image du commanditaire)

Référence fournie : une zone héroïque acide vibrante en haut, le solde
dans une plaque de verre, le corps noir. Consigne : ce style sur mobile,
bureau et les autres écrans ; le header et le hero, pas la nav.

**La transposition.**
- **Jetons `--hero-*`** dérivés de l'acide de la palette :
  #8FE500 → #A2FF01 → #D8FF5E → #E7FF94, plus une fumée sombre radiale
  (le geste de la référence). Aucune couleur nouvelle hors dérivés.
- **`.solde-carte` devient le hero** partout où un solde vit : accueil,
  commerçant, PME, e-commerce — mobile ET bureau, d'un seul style.
- **La plaque de verre** (blanc .36 + blur 12) est assemblée au
  chargement par `poseHero()` : ligne d'identité + montant + delta y
  montent ; les capsules restent sur l'acide.
- **Tout texte du hero passe à l'encre #141414** — y compris deux
  couleurs figées en dur dans le HTML des hubs (`style="color:
  var(--encre)"`) qui auraient été blanches sur acide.
- **Accueil mobile : bord à bord.** L'en-tête (Bonsoir + cloche) se pose
  sur l'acide, le bloc va d'un bord à l'autre et s'arrondit en bas
  (30 px) — raccord mesuré sans couture. Les quatre gestes s'écrivent à
  l'encre, le principal s'inverse : disque d'encre, icône acide.
- **La nav ne bouge pas** (demande explicite) : topbar bureau et pilule
  basse restent sombres. Le deux-tons est un contraste, pas une
  inondation.

**Attrapé par la sonde de contraste** : le badge « le moins cher » était
gris sur acide (2,56:1) — la sous-ligne `.row .txt span` battait
`.badge-conseil` en spécificité et lui imposait son gris. Corrigé par un
sélecteur plus fort. Et une sonde qui mentait : `querySelector(".btn
.lib-m")` attrapait le bouton PRIMAIRE, dont l'icône est acide par
conception — l'assertion visait le mauvais élément, pas un défaut.

Sonde parcours 16 : 16/16 (structure du hero, encre, bord-à-bord,
raccord, contraste 7:1 au pire du dégradé, nav intacte aux deux formats).

> **RÉVOQUÉ le 2026-08-28 à 22:40, sur décision de LO.** Le montage décrit
> ci-dessous a été retiré : `git checkout ae4c6e3` a ramené l'app à son état
> d'avant. Motif donné, et exact : **plusieurs fonds vivaient sur une même
> page**, et le rendu bureau — que je n'avais jamais capturé — était
> inutilisable. Ce qui reste en place aujourd'hui : **un seul fond**, la
> texture sombre fournie, et le hero acide en CSS de la boucle 25.
>
> Ce qui a été gardé de ces boucles :
> - le correctif d'opacité (un montant lié aux données ne s'estompe plus) —
>   c'est une correction, pas une direction visuelle ;
> - la sonde de contraste corrigée et **étalonnée** ;
> - les mesures : les 7 cartes givrées ne portent aucun texte, l'accent
>   comme texte sur blanc tient 1,25:1. Elles restent vraies et serviront.
>
> Ce qui vient à la place : un fond deux tons **en une seule image** et une
> carte 3D translucide générée sous Rodin — prompts dans `PROMPTS-ASSETS.md`.

## Boucles 29-30 (révoquées) — les assets du commanditaire comme matériau

Le verre écrit à la main a été refusé : « tous les composants en verre que
tu crées ont la même gueule et ne ressemblent pas à la ref ». Des rendus 3D
ont été déposés dans `design/pivot/assets/` — huit cartes, quatre fonds,
deux surfaces vertes. Le CSS ne fabrique plus de verre : il monte des
images.

**Le montage, en trois pièces et deux jeux.**
- `--fond-corps` : le fond texturé, sur le corps de l'app. C'est lui qui
  remplace les traits verticaux, sur demande explicite.
- `--fond-hero` : la surface verte, **découpée par un masque SVG** et posée
  sur l'en-tête et le solde — la « densité » demandée pour cette zone.
- `--carte-verre` : la carte, **détourée** (PNG à alpha), donc posable sur
  n'importe quel fond. Ratio fixe : l'étirer détruit son éclairage interne
  (mesuré : en cadre 9 zones elle devenait une barre métallique).

Un jeu par thème, et une bascule clair/sombre qui retient le choix et
respecte celui du système au premier chargement. Un thème ne change pas
que des couleurs : il **change de jeu d'assets**.

**Le défaut le plus grave n'était pas visible à l'œil.**
La carte givrée choisie pour le thème sombre ne portait pas son texte :
**1,94:1 au pire pixel** sous le montant. La capture semblait bonne parce
que l'ombre portée fabriquait un halo — un halo n'est pas du contraste. Les
huit cartes ont donc été mesurées, chacune sur sa zone de texte, au pire
pixel et non en moyenne :

| famille | verdict |
|---|---|
| 7 cartes givrées / néon | **aucun texte ne tient** — ni blanc ni noir |
| 4 cartes en verre sombre | le blanc passe, de 4,75:1 à 8,79:1 |

Le verre givré est un beau matériau qui ne peut rien porter. On a pris
`Dark_glass_bank_card_render_…2116` (liseré acide, 5,35:1 au pire pixel) :
corps sombre dans les deux thèmes, liseré qui la détache de la nappe —
c'est exactement le geste de la référence.

**L'accent a trois rôles, pas un.** Sur blanc, le néon écrit à 1,25:1.
Séparés et mesurés avant d'être posés :

| jeton | rôle | sombre | clair |
|---|---|---|---|
| `--acide` | remplissage : disques, boutons, FAB (encre #141414 à 14:1) | #A2FF01 | #A2FF01 |
| `--acide-encre` | l'accent **écrit** | #A2FF01 | #4D7A00 — 5,10:1 sur blanc, 4,63:1 sur le sol |
| `--acide-trace` | l'accent qui porte une **donnée** (seuil 3:1) | #A2FF01 | #66A300 — 3,08:1 sur blanc |

**Deux défauts antérieurs tombés au passage.** La règle qui estompe les
centimes (`.montant span`) frappait aussi les montants entiers, parce
qu'ils sont enveloppés dans un span de liaison de données ; l'exception ne
connaissait que `data-caisse`. La caisse du jour de e-commerce s'affichait
donc à 38 % d'opacité **dans les deux thèmes, depuis toujours**. Logique
inversée : on n'estompe que le span **sans** attribut de liaison, pour
qu'un futur profil n'ait pas à s'inscrire dans une liste d'exceptions.

## État : 65 écrans · 314/314 · 0 défaut · deux thèmes mesurés

Contraste : aucune combinaison sous le seuil, en clair comme en sombre.
Cibles tactiles, tailles de texte, retours de flux, libellés de boutons,
ordre d'affichage mobile : conformes.

## Leçons payées (reportées à la skill si récurrentes)

**La sonde ment aussi — trois fois sur cette boucle.**

1. *Une valeur composée lue dans la mauvaise échelle.* `color-mix()` rend
   `color(srgb 0.95 0.95 0.94 / 0.78)` : composantes en **0-1**, lues comme
   des 0-255, donc un blanc cassé rendu presque **noir**. Le symptôme qui a
   trahi le bug : **assombrir l'encre faisait BAISSER le contraste
   annoncé**, ce qui est impossible sur un fond clair. Une mesure qui varie
   dans le mauvais sens est un bug de sonde, jamais un résultat.
2. *Un fond en IMAGE n'a pas de couleur.* La sonde remontait les ancêtres
   jusqu'au sol du thème et comparait le texte blanc de la carte au blanc
   de la page — « blanc sur blanc », alors que la carte est sombre. Une
   image de fond **déclare** désormais `--fond-mesure`, relevé sur l'asset
   à son pire pixel. La sonde signale toute image qui ne le déclare pas.
3. *Un sélecteur trop large est un faux PASS.* « une `.plaque-verre` existe
   dans cet écran » passait alors qu'aucune carte n'était montée dans le
   hero de PME — il y en avait une plus bas dans la page. Resserré en
   `.solde-carte > .plaque-verre`.

**L'étalonnage n'est pas facultatif.** Trois paires dont la réponse est
posée à la main **avant** de lancer la sonde, passant par le même code que
la mesure réelle ; si l'une dévie, la sonde refuse de rendre ses mesures.
Au premier essai c'est **mon arithmétique** qui était fausse, pas la sonde
(18,73 au lieu de 18,42) — c'est exactement le doute que l'étalonnage sert
à trancher.

**Une couleur de repli ne se peint pas sous une image à alpha** : elle
déborde de la silhouette et dessine un rectangle autour. Si on la veut
pour la mesure, on la **déclare** sans la peindre.

**Une attente figée dans une sonde ment sur la cause.** Le ratio de la
carte était écrit `470 / 319` ; changer d'asset faisait échouer la sonde
en accusant un étirement. Elle lit maintenant le jeton.

- Page autonome sans `<meta name="viewport">` → un vrai téléphone rend à
  980 px. Les captures headless (fenêtre clampée ~512) le masquent ;
  seule l'émulation CDP le montre.
- Un événement clavier synthétique doit être `bubbles: true` pour
  éprouver un listener `window`.
- Les transitions JS se déclarent (`data-mene`) pour que le graphe de
  flows reste vérifiable mécaniquement.
