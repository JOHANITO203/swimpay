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

## Leçons payées (reportées à la skill si récurrentes)
- Page autonome sans `<meta name="viewport">` → un vrai téléphone rend à
  980 px. Les captures headless (fenêtre clampée ~512) le masquent ;
  seule l'émulation CDP le montre.
- Un événement clavier synthétique doit être `bubbles: true` pour
  éprouver un listener `window`.
- Les transitions JS se déclarent (`data-mene`) pour que le graphe de
  flows reste vérifiable mécaniquement.
