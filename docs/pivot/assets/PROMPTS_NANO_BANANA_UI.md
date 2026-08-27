# Prompts Nano Banana Pro — UI SwimPay (profils & services)
# Version : identité vierge (aucune couleur ni typo imposée) · neutre géographiquement

Mode d'emploi :
1. Coller **STYLE MASTER + un prompt d'écran** par génération (1 écran = 1
   image → texte net). Format 4:5 ou 9:16.
2. **Générer l'ÉCRAN 1 en premier, plusieurs fois**, jusqu'à obtenir une
   identité visuelle qui te plaît. C'est le modèle qui propose la direction.
3. **Joindre ce rendu choisi comme image de référence** à chaque génération
   suivante, en ajoutant en tête : « Same visual identity, same palette, same
   typography, same phone frame as the reference image. » C'est ce qui tient
   la cohérence sans figer les couleurs dans le prompt.
4. Régénérer tout écran dont le texte français sort flou ou mal orthographié.

---

## STYLE MASTER (à coller en tête de chaque génération)

```
Premium mobile fintech app UI concept, "SwimPay". One clean phone mockup
centered on the canvas, thin neutral device frame, soft shadow, even generous
margins on all sides, calm studio backdrop — the screen content is the hero,
not the device.

VISUAL IDENTITY: this is a brand-new product with no existing brand. YOU
choose the entire visual identity — color palette, typography, light or dark
mood, surface treatment, texture — make it distinctive, premium, trustworthy
and non-generic, then keep it PERFECTLY IDENTICAL across every screen of the
set. Avoid template-like fintech styling and common AI-design clichés. Use one
clear accent, applied sparingly to primary actions and selected states. Clean
hierarchy, rounded cards, custom-feeling thin-stroke icons (never generic
icon-library style). Connected payment networks are shown ONLY as four small
distinct colored dots of your choosing — never named, no brand logos.

ALL interface text in FRENCH, rendered exactly as quoted, correctly spelled,
comfortably large and readable. Amounts formatted like "25 500 F" with thin
spaces. No English words in the UI, no lorem ipsum, no country or region
references, no random charts, no clutter of pills and badges. Calm,
trustworthy, art-directed. Status bar 9:41, battery, signal.
```

---

## ÉCRAN 1 — Choix du profil

```
SCREEN — profile choice, first launch. Top: small SwimPay logo mark of your
design + wordmark "SwimPay". Title, large and bold: "Vous êtes…" with short
subtitle "Choisissez votre profil pour commencer".
Two large stacked selection cards filling the middle, equal height:
Card 1 "Personnel" — subtitle "Envoyer, recevoir, transférer entre réseaux" —
thin person icon.
Card 2 "Business" — subtitle "Encaisser, facturer, payer votre équipe" — thin
storefront icon. Card 2 is in selected state, clearly marked with the accent
(hairline border + small check dot top-right).
Bottom, safe-area aware: full-width primary button "Continuer".
Airy spacing, one clear focal point, nothing else on screen.
```

## ÉCRAN 2 — Choix du profil Business

```
SCREEN — business profile choice. Top: back chevron, small title "Business".
Large bold title: "Votre profil business" subtitle "Chaque profil a ses
outils". 2×2 grid of four equal selection cards, generous gaps:
"Commerçant" — "Encaissez et facturez au comptoir" — thin QR-code icon.
"PME" — "Caisses, salaires et comptabilité" — thin building icon.
"Comptable" — "Tous vos dossiers sur un écran" — thin ledger-book icon.
"E-commerce" — "Encaissez sur votre site" — thin shopping-bag icon.
"PME" card in selected state, marked with the accent (hairline border + check
dot). Bottom safe-area: full-width primary button "Continuer".
Clean, calm, no other UI.
```

## ÉCRAN 3 — Accueil PERSONNEL (services + boutons d'action)

```
SCREEN — personal home. Top row: circular avatar with initials "CL", greeting
"Bonsoir, Camille" small and secondary, right-side thin bell icon.
Action grid, the hero of the screen — 6 rounded action buttons in a 2×3 grid,
each a card with a thin-stroke icon, a label, and a tiny price caption in
secondary text:
"Envoyer" (caption "Gratuit"), "Transférer entre réseaux" (caption "1 %" plus
a tiny accent badge "bientôt gratuit"), "Vers la banque" (caption "1 %"),
"Recevoir" (caption "Mon QR"), "Payer un contact" (caption "Annuaire
vérifié"), "Mes reçus" (caption "Historique").
Below: section header "Dernières opérations" with two list rows, each with a
small network dot: "Envoyé à Julien" amount "− 10 000 F"; "Reçu de Sarah"
amount "+ 6 500 F" styled as a positive amount.
Bottom tab bar, 4 tabs: "Accueil" (active), "Envoyer", "Recevoir", "Profil".
Home indicator visible.
```

## ÉCRAN 4 — Accueil COMMERÇANT

```
SCREEN — merchant home "Ma journée". Top: small shop avatar, "Boutique
Centrale" bold, date "Mercredi 27 août" secondary.
Hero block: huge tabular number "25 500 F" with label above "Encaissé
aujourd'hui" and a row of four small anonymous network dots with caption
"Tous réseaux + espèces".
Row of two primary action buttons side by side: filled accent "Encaisser"
(QR icon) and outlined "Facturer" (invoice icon).
Below, two compact list cards:
"À vérifier" with an accent count chip "2" and caption "paiements à relier";
"Factures du jour" with caption "14 émises" and a small positive check
"Certifiées".
Small secondary footer line: "Résumé du soir envoyé à 20h".
Bottom tab bar: "Accueil" (active), "Encaisser", "Factures", "Réglages".
```

## ÉCRAN 5 — Accueil PME

```
SCREEN — SME dashboard. Top: company "Delta Distribution" bold with segmented
control just below, three segments: "Caisse 1" "Caisse 2" "Toutes" ("Toutes"
active). Hero metric card: label "Chiffre du mois", big number "4 820 000 F",
small positive delta "+ 14 %" and caption "TVA prête · 867 600 F".
Vertical stack of four service rows, each an icon + label + chevron:
"Payer salaires & fournisseurs" caption "0,5 % · min 500 F",
"Importer clients & produits" caption "Fichier Excel",
"Virements banque" caption "Vers un compte bancaire",
"Exports comptables" caption "Pour votre comptable".
One primary button bottom: "Payer mon équipe".
Bottom tab bar: "Accueil" (active), "Ventes", "Payer", "Réglages".
```

## ÉCRAN 6 — Console COMPTABLE

```
SCREEN — accountant console "Mes dossiers". Top: "Cabinet Morel" bold,
caption "28 dossiers · 3 en retard" with a small alert dot.
Search field "Rechercher un dossier…", thin and quiet.
List of three company rows, each a card: company name bold, beneath it a
secondary line with monthly figure and invoice count, and at right a status
chip with two clearly distinct states:
"Boutique Centrale — 480 000 F · 62 factures" chip "À jour";
"Delta Distribution — 4,8 M F · 210 factures" chip "À jour";
"Atelier Verne — 0 F · 0 facture" chip "En retard" (warning state).
Below the list, one wide outlined button "Exporter vers mon logiciel" and a
secondary caption "Gratuit pour les dossiers abonnés · 1 500 F par dossier
géré".
Bottom tab bar: "Dossiers" (active), "Alertes", "Exports", "Profil".
```

## ÉCRAN 7 — E-COMMERCE

```
SCREEN — e-commerce dashboard "Mes ventes en ligne". Top: store name "Studio
Lumen" bold, caption "pay.swimpay.app/lumen".
Hero metric: "Cette semaine", big "312 000 F", caption "43 commandes payées ·
1,8 % par transaction".
Primary button: "Créer un lien de paiement" with link icon.
Below, list of three order rows, each with a small network dot:
"Commande #1042 — 15 000 F" chip "Payée"; "Commande #1041 — 8 500 F" chip
"Payée"; "Commande #1040 — 22 000 F" quiet chip "En attente".
Small info card at bottom: thin webhook icon, "Notifications temps réel
activées" and second line "Facture certifiée émise sur chaque vente" with a
positive check.
Bottom tab bar: "Ventes" (active), "Liens", "Factures", "Réglages".
```

---

### Variante planche (optionnelle, pour une slide de présentation)

```
Wide 16:9 presentation board, calm backdrop, title top-left "SwimPay — deux
profils, six espaces". Seven identical phone mockups arranged in two neat rows
(3 top, 4 bottom), equal scale, equal gutters, soft shadows, each phone
showing one of the seven screens described above, all in the same visual
identity as the reference image. Below each phone a small secondary caption:
"Choix du profil", "Business", "Personnel", "Commerçant", "PME", "Comptable",
"E-commerce". Screen text may be simplified but titles must stay readable.
```

**Astuces** : générer plusieurs variantes de l'écran 1 pour choisir la
direction (claire ? sombre ? chaude ?) — c'est ta séance d'exploration
d'identité ; ensuite l'image de référence fait loi. Régénérer un écran si un
mot français sort mal écrit (fréquent sur les accents). Pour retoucher un
élément, re-décrire l'écran entier plutôt que demander une retouche partielle.
