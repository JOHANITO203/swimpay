# Boucle de livraison — SwimPay acide, l'app complète

## La consigne (verbatim, 2026-08-28)

> délivrez toute l'UX de l'app et toute l'UI de l'app ainsi que les flows

Direction validée par le commanditaire : la robe « acide » (v6) et son flow
d'envoi à clôture animée. Tout le reste se décline dans cette robe, dans le
même artifact navigable (une URL).

## Definition of done — par écran

1. **Construit** : l'écran existe dans `ecran3-personnel-v6-acide.html`,
   mobile-first + déclinaison desktop, un seul élément acide, montants sans
   devise, aucune géographie ni marque tierce.
2. **Relié** : chaque bouton du flow mène quelque part (`data-va`), l'écran
   est **atteignable** depuis l'accueil ou l'onboarding.
3. **Sondé** : `sonde-app.mjs` passe — zéro débord à 390 et 1280, zéro cible
   de navigation cassée, zéro écran orphelin ; les interactions clés du lot
   vérifiées par clic réel (CDP).
4. **Livré** : republication de l'artifact + commit.

## Backlog

| # | écran (id) | flow | lot | construit | sondé | statut |
|---|---|---|---|---|---|---|
| 1 | Accueil (`accueil`) | hub → tout | fait | ✔ | ✔ | validé |
| 2 | Envoyer (`envoyer`) | numpad → clôture | fait | ✔ | ✔ | validé |
| 3 | Transfert envoyé (`envoye`) | clôture animée, grand livre | fait | ✔ | ✔ | validé |
| 4 | Activité (`activite`) | chips, anneau, détail op | fait | ✔ | ✔ | validé |
| 5 | Ma carte (`carte-ecran`) | détails + onglet activité | A | ✔ (détails) | ✔ | onglet à faire |
| 6 | Détail d'opération (sheet) | depuis Activité / reçus | A | ✖ | ✖ | à faire |
| 7 | Notifications (`notifs`) | depuis les cloches | A | ✖ | ✖ | à faire |
| 8 | Splash (`splash`) | auto → bienvenue | B | ✖ | ✖ | à faire |
| 9 | Bienvenue (`bienvenue`) | CTA → téléphone | B | ✖ | ✖ | à faire |
| 10 | Téléphone (`onb-tel`) | numpad, étape 1/4 | B | ✖ | ✖ | à faire |
| 11 | Code OTP (`onb-otp`) | 5 cases, auto-suite | B | ✖ | ✖ | à faire |
| 12 | Identité (`onb-nom`) | champ, étape 3/4 | B | ✖ | ✖ | à faire |
| 13 | Code secret (`onb-pin`) | 4 points, auto-suite | B | ✖ | ✖ | à faire |
| 14 | Compte prêt (`onb-pret`) | coche animée → accueil | B | ✖ | ✖ | à faire |
| 15 | Recevoir (`recevoir`) | QR + demander un montant | C | ✖ | ✖ | à faire |
| 16 | Demander (`demande`) | numpad → QR chiffré | C | ✖ | ✖ | à faire |
| 17 | Scanner (`scanner`) | viseur → marchand détecté | C | ✖ | ✖ | à faire |
| 18 | Payer marchand (`payer`) | montant → clôture paiement | C | ✖ | ✖ | à faire |
| 19 | Entre réseaux (`swap`) | A⇄B + récap → clôture | C | ✖ | ✖ | à faire |
| 20 | Vers la banque (`banque`) | compte + délai → clôture | C | ✖ | ✖ | à faire |
| 21 | Mes reçus (`recus`) | liste → détail (sheet) | C | ✖ | ✖ | à faire |
| 22 | Profil (`profil`) | identité, sécurité, limites | C | ✖ | ✖ | à faire |
| 23 | Choix de profil (`profils`) | Personnel / 4 Business | D | ✖ | ✖ | à faire |
| 24 | Commerçant (`b-commercant`) | encaisser → QR → reçu | D | ✖ | ✖ | à faire |
| 25 | PME (`b-pme`) | salaires en 1 clic (cascade) | D | ✖ | ✖ | à faire |
| 26 | Comptable (`b-comptable`) | console, écritures à valider | D | ✖ | ✖ | à faire |
| 27 | E-commerce (`b-ecommerce`) | checkout marchand | D | ✖ | ✖ | à faire |

Hors périmètre assumé (à dire si voulu) : recherche globale, vrai contenu
d'aide, écrans d'erreur réseau.

## Journal des boucles

### Boucle 0 — mise en place (2026-08-28)
- Créé ce journal ; généralisé la clôture (`envoye`) pour resservir aux
  paiements/swaps ; `sonde-app.mjs` écrit (découverte des écrans, débords
  390/1280, cibles `data-va` cassées, atteignabilité par graphe).
- Vérif : sonde verte sur l'existant (5 écrans) avant d'ajouter quoi que ce soit.
