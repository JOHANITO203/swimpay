# Prompts Nano Banana Pro — UI SwimPay (profils & services)

Mode d'emploi : coller **STYLE MASTER + un prompt d'écran** par génération
(1 écran = 1 image → texte net). Format 4:5 ou 9:16. Régénérer tout écran dont
le texte sort flou ou en anglais.

---

## STYLE MASTER (à coller en tête de chaque génération)

```
Premium mobile fintech app UI concept, "SwimPay", Ivory Coast. One clean dark
phone mockup centered on the canvas, thin neutral device frame, soft shadow,
even generous margins on all sides, deep charcoal studio backdrop with subtle
film grain — the screen content is the hero, not the device.

DESIGN SYSTEM (identical across the whole set): deep night background #08080C,
elevated surfaces #14141C and #1B1B26, warm ivory text #F1ECE2, muted lavender-
grey secondary text #9B95A8, ONE single violet accent #8264D2 used sparingly on
primary buttons and key highlights, success green #5BC199 for positive amounts.
Matte tactile surfaces, ultra-subtle grain, faint violet ambient glow top-left.
Typography: DM Sans style geometric sans — bold confident titles, clean body,
generous line spacing. Rounded 16px cards, thin 1px hairline borders
rgba(241,236,226,0.10). Custom thin-stroke icons with rounded terminals, never
generic icon-library style. Mobile-money operator identity shown ONLY as small
colored dots: cyan (Wave), orange (Orange Money), yellow (MTN), blue (Moov).

ALL interface text in FRENCH, rendered exactly as quoted, correctly spelled,
comfortably large and readable. Amounts in FCFA with thin spaces (ex: 25 500 F).
No English words in the UI, no lorem ipsum, no random charts, no glassmorphism,
no neon, no blue-purple gradient clichés, no clutter of pills and badges.
Calm, trustworthy, art-directed, non-generic. Status bar 9:41, battery, signal.
```

---

## ÉCRAN 1 — Choix du profil

```
SCREEN — profile choice, first launch. Top: small SwimPay logo mark (rounded
violet gradient square) + wordmark "SwimPay". Title, large and bold:
"Vous êtes…" with short subtitle "Choisissez votre profil pour commencer".
Two large stacked selection cards filling the middle, equal height:
Card 1 "Personnel" — subtitle "Envoyer, recevoir, transférer entre réseaux" —
thin person icon.
Card 2 "Business" — subtitle "Encaisser, facturer, payer votre équipe" — thin
storefront icon. Card 2 is selected: violet #8264D2 hairline border and soft
violet inner glow, small violet check dot top-right.
Bottom, safe-area aware: full-width violet primary button "Continuer".
Airy spacing, one clear focal point, nothing else on screen.
```

## ÉCRAN 2 — Choix du profil Business

```
SCREEN — business profile choice. Top: back chevron, small title "Business".
Large bold title: "Votre profil business" subtitle "Chaque profil a ses outils".
2×2 grid of four equal selection cards, generous gaps:
"Commerçant" — "Encaissez et facturez au comptoir" — thin QR-code icon.
"PME" — "Caisses, salaires et comptabilité" — thin building icon.
"Comptable" — "Tous vos dossiers sur un écran" — thin ledger-book icon.
"E-commerce" — "Encaissez sur votre site" — thin shopping-bag icon.
"PME" card selected with violet hairline border + check dot.
Bottom safe-area: full-width violet button "Continuer".
Clean, calm, no other UI.
```

## ÉCRAN 3 — Accueil PERSONNEL (services + boutons d'action)

```
SCREEN — personal home. Top row: circular avatar with initials "AK", greeting
"Bonsoir, Aya" small muted, right-side thin bell icon.
Action grid, the hero of the screen — 6 rounded action buttons in a 2×3 grid,
each a dark #14141C card with a thin-stroke icon, a label, and a tiny price
caption in muted text:
"Envoyer" (caption "Gratuit"), "Transférer entre réseaux" (caption "1 %" plus a
tiny violet badge "bientôt gratuit"), "Vers la banque" (caption "1 %"),
"Recevoir" (caption "Mon QR"), "Payer un contact" (caption "Annuaire vérifié"),
"Mes reçus" (caption "Historique").
Below: section header "Dernières opérations" with two list rows: cyan dot,
"Envoyé à Kouadio", "− 10 000 F" ivory; orange dot, "Reçu de Fatou",
"+ 6 500 F" in green #5BC199.
Bottom tab bar, 4 tabs: "Accueil" (active, violet), "Envoyer", "Recevoir",
"Profil". Home indicator visible.
```

## ÉCRAN 4 — Accueil COMMERÇANT

```
SCREEN — merchant home "Ma journée". Top: small shop avatar, "Boutique d'Aya"
bold, date "Mercredi 27 août" muted.
Hero block: huge tabular number "25 500 F" with label above "Encaissé
aujourd'hui" and a row of four small operator dots (cyan, orange, yellow, blue)
with caption "Tous réseaux + espèces".
Row of two primary action buttons side by side: violet filled "Encaisser"
(QR icon) and dark outlined "Facturer" (invoice icon).
Below, two compact list cards:
"À vérifier" with violet count chip "2" and caption "paiements à relier";
"Factures du jour" with caption "14 émises · timbre 20 F" and a small green
check "En règle DGI".
Small muted footer line: "Résumé du soir envoyé à 20h sur WhatsApp".
Bottom tab bar: "Accueil" (active), "Encaisser", "Factures", "Réglages".
```

## ÉCRAN 5 — Accueil PME

```
SCREEN — SME dashboard. Top: company "Koné Distribution" bold with segmented
control just below, three segments: "Caisse 1" "Caisse 2" "Toutes" ("Toutes"
active in violet).
Hero metric card: label "Chiffre du mois", big number "4 820 000 F", small
green delta "+ 14 %" and caption "TVA prête · 867 600 F".
Vertical stack of four service rows, each an icon + label + chevron:
"Payer salaires & fournisseurs" caption "0,5 % · min 500 F",
"Importer clients & produits" caption "Fichier Excel",
"Virements banque" caption "Vers un RIB",
"Exports comptables" caption "Pour votre comptable".
One violet primary button bottom: "Payer mon équipe".
Bottom tab bar: "Accueil" (active), "Ventes", "Payer", "Réglages".
```

## ÉCRAN 6 — Console COMPTABLE

```
SCREEN — accountant console "Mes dossiers". Top: "Cabinet Koffi" bold, caption
"28 dossiers · 3 en retard" with a small amber alert dot.
Search field "Rechercher un dossier…" thin and dark.
List of three company rows, each a dark card: company name bold, beneath it a
muted line "CA du mois · factures · TVA", and at right a status chip:
"Boutique d'Aya — 480 000 F · 62 factures" chip green "À jour";
"Koné Distribution — 4,8 M F · 210 factures" chip green "À jour";
"Dépôt Yao — 0 F · 0 facture" chip amber "En retard".
Below the list, one wide dark outlined button "Exporter vers mon logiciel" and
a muted caption "Gratuit pour les dossiers abonnés · 1 500 F par dossier géré".
Bottom tab bar: "Dossiers" (active), "Alertes", "Exports", "Profil".
```

## ÉCRAN 7 — E-COMMERCE

```
SCREEN — e-commerce dashboard "Mes ventes en ligne". Top: store name "Sika
Shop" bold, caption "swimpay.ci/pay/sikashop".
Hero metric: "Cette semaine", big "312 000 F", caption "43 commandes payées ·
1,8 % par transaction".
Primary violet button: "Créer un lien de paiement" with link icon.
Below, list of three order rows: "Commande #1042 — 15 000 F" green chip
"Payée · Wave" with cyan dot; "Commande #1041 — 8 500 F" green chip "Payée ·
Orange" orange dot; "Commande #1040 — 22 000 F" muted chip "En attente".
Small info card at bottom: thin webhook icon, "Notifications temps réel
activées" and second line "Facture DGI émise sur chaque vente" with green
check.
Bottom tab bar: "Ventes" (active), "Liens", "Factures", "Réglages".
```

---

### Variante planche (optionnelle, pour une slide de présentation)

```
Wide 16:9 presentation board, deep charcoal backdrop with subtle grain, title
top-left in ivory "SwimPay — deux profils, six espaces". Seven identical dark
phone mockups arranged in two neat rows (3 top, 4 bottom), equal scale, equal
gutters, soft shadows, each phone showing one of the seven screens described
above in the same design system. Below each phone a small muted caption:
"Choix du profil", "Business", "Personnel", "Commerçant", "PME", "Comptable",
"E-commerce". Screen text may be simplified but titles must stay readable.
```

**Astuces** : régénérer un écran si un mot français sort mal écrit (fréquent
sur les accents) ; demander « same design system, same phone frame » en tête de
chaque nouvelle génération d'une même série ; pour retoucher un seul élément,
re-décrire l'écran entier plutôt que demander une retouche partielle.
