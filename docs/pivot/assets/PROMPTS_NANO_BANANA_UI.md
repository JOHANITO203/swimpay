# Prompts UI SwimPay — format squelette (piloté par image de référence)

Méthode (celle de LO) : le prompt ne décrit **que la structure** (zones +
composants, télégraphique). **Le style vient des images de référence** jointes
à la génération — jamais du texte. Aucune couleur, aucune typo, aucune ambiance
dans les prompts.

Règles d'output :
- **Écran edge-to-edge : l'image EST l'écran** — pas de mockup de téléphone,
  pas de cadre, pas de fond de studio. Ratio 9:16.
- Texte d'interface en français, tel que cité.
- 1 écran = 1 génération. Joindre la/les images de référence à chaque fois.

## Amorce (une ligne, à coller avant chaque squelette)

```
mobile app screen · edge-to-edge · full-bleed · no phone mockup, no device
frame, no bezel, no background canvas — the image is the screen itself · 9:16 ·
status bar and home indicator included · visual style entirely from the
reference image(s) · UI text in French · layout below
```

---

```
ÉCRAN 1 — Choix du profil

mobile header
logo + wordmark "SwimPay"

hero
title "Vous êtes…"
subtitle "Choisissez votre profil pour commencer"

mobile body
profile card "Personnel" · person icon · "Envoyer, recevoir, transférer entre réseaux"
profile card "Business" · storefront icon · "Encaisser, facturer, payer votre équipe" (selected)

footer
primary button "Continuer"
```

```
ÉCRAN 2 — Choix du profil Business

mobile header
back chevron · title "Business"

hero
title "Votre profil business"
subtitle "Chaque profil a ses outils"

mobile body
2×2 grid of profile cards:
"Commerçant" · QR icon · "Encaissez et facturez au comptoir"
"PME" · building icon · "Caisses, salaires et comptabilité" (selected)
"Comptable" · ledger icon · "Tous vos dossiers sur un écran"
"E-commerce" · bag icon · "Encaissez sur votre site"

footer
primary button "Continuer"
```

```
ÉCRAN 3 — Accueil PERSONNEL

mobile header
user picture · search · notifications

hero
amount in XOF
send button "Envoyer" · receive button "Recevoir" · transfer button "Transférer" · history button "Historique"

mobile body
swap button "Transférer entre réseaux" · caption "1 % · bientôt gratuit"
to bank button "Vers la banque" · caption "1 %"
pay contact button "Payer un contact" · caption "annuaire vérifié"
receipts button "Mes reçus"
section "Dernières opérations" · 3 rows: contact name · network dot · amount

bottom navigation
4 tabs: "Accueil" (active) · "Envoyer" · "Recevoir" · "Profil"
```

```
ÉCRAN 4 — Accueil COMMERÇANT

mobile header
shop avatar · name "Boutique Centrale" · date "Mercredi 27 août"

hero
amount in XOF · label "Encaissé aujourd'hui"
4 network dots · caption "Tous réseaux + espèces"
primary button "Encaisser" (QR icon) · secondary button "Facturer" (invoice icon)

mobile body
card "À vérifier" · count 2 · caption "paiements à relier"
card "Factures du jour" · caption "14 émises · Certifiées"
footer line "Résumé du soir envoyé à 20h"

bottom navigation
4 tabs: "Accueil" (active) · "Encaisser" · "Factures" · "Réglages"
```

```
ÉCRAN 5 — Accueil PME

mobile header
company name "Delta Distribution"
segmented control "Caisse 1 · Caisse 2 · Toutes" (Toutes active)

hero
amount in XOF · label "Chiffre du mois" · delta "+ 14 %"
caption "TVA prête · 867 600 F"

mobile body
service row "Payer salaires & fournisseurs" · caption "0,5 % · min 500 F"
service row "Importer clients & produits" · caption "Fichier Excel"
service row "Virements banque" · caption "vers un compte bancaire"
service row "Exports comptables" · caption "pour votre comptable"
primary button "Payer mon équipe"

bottom navigation
4 tabs: "Accueil" (active) · "Ventes" · "Payer" · "Réglages"
```

```
ÉCRAN 6 — Console COMPTABLE

mobile header
cabinet name "Cabinet Morel" · caption "28 dossiers · 3 en retard" · alert dot

hero
search field "Rechercher un dossier…"

mobile body
dossier card "Boutique Centrale" · "480 000 F · 62 factures" · status chip "À jour"
dossier card "Delta Distribution" · "4,8 M F · 210 factures" · status chip "À jour"
dossier card "Atelier Verne" · "0 F · 0 facture" · status chip "En retard"
secondary button "Exporter vers mon logiciel"
caption "Gratuit pour les dossiers abonnés · 1 500 F par dossier géré"

bottom navigation
4 tabs: "Dossiers" (active) · "Alertes" · "Exports" · "Profil"
```

```
ÉCRAN 7 — E-COMMERCE

mobile header
store name "Studio Lumen" · caption "pay.swimpay.app/lumen"

hero
amount in XOF · label "Cette semaine"
caption "43 commandes payées · 1,8 % par transaction"
primary button "Créer un lien de paiement" (link icon)

mobile body
order row "Commande #1042 · 15 000 F" · network dot · chip "Payée"
order row "Commande #1041 · 8 500 F" · network dot · chip "Payée"
order row "Commande #1040 · 22 000 F" · chip "En attente"
info card · "Notifications temps réel activées" · "Facture certifiée émise sur chaque vente"

bottom navigation
4 tabs: "Ventes" (active) · "Liens" · "Factures" · "Réglages"
```

---

# DÉCLINAISONS DESKTOP (après validation du mobile)

Amorce desktop :

```
desktop app screen · edge-to-edge viewport · no browser mockup, no window
frame, no background canvas — the image is the screen itself · 16:10 · visual
style entirely from the reference image(s) · UI text in French · layout below
```

```
ÉCRAN D1 — Console COMPTABLE (desktop)

sidebar
logo SwimPay · "Dossiers" (active) · "Alertes" · "Exports" · "Profil"

header
title "Cabinet Morel" · caption "28 dossiers · 3 en retard"
search field "Rechercher un dossier…" · primary button "Exporter vers mon logiciel"

main
data table · columns "Dossier · Chiffre du mois · Factures · TVA · Statut" · 6 rows
row "Boutique Centrale · 480 000 F · 62 · 86 400 F" · chip "À jour"
row "Delta Distribution · 4 820 000 F · 210 · 867 600 F" · chip "À jour"
row "Atelier Verne · 0 F · 0 · 0 F" · chip "En retard"
caption "Gratuit pour les dossiers abonnés · 1 500 F par dossier géré"

side panel
"Alertes" · 2 items: "Atelier Verne — aucune facture ce mois" · "2 dossiers sans export"
```

```
ÉCRAN D2 — PME (desktop)

sidebar
logo SwimPay · "Accueil" (active) · "Ventes" · "Payer" · "Réglages"

header
company "Delta Distribution" · segmented control "Caisse 1 · Caisse 2 · Toutes"
primary button "Payer mon équipe"

main
3 metric cards: "Chiffre du mois · 4 820 000 F · + 14 %" · "TVA prête · 867 600 F" · "À vérifier · 2 paiements"
table "Dernières ventes" · columns "Heure · Description · Réseau · Montant · Facture" · 5 rows · check "Certifiée"

side panel
quick actions: "Importer clients & produits" · "Virements banque" · "Exports comptables"
```

```
ÉCRAN D3 — E-COMMERCE (desktop)

sidebar
logo SwimPay · "Ventes" (active) · "Liens" · "Factures" · "Réglages"

header
store "Studio Lumen" · caption "pay.swimpay.app/lumen"
primary button "Créer un lien de paiement"

main
stats strip: "Cette semaine · 312 000 F" · "43 commandes payées" · "1,8 % par transaction"
orders table · columns "Commande · Date · Montant · Réseau · Statut · Facture" · 6 rows · chips "Payée" / "En attente"
info card · "Notifications temps réel activées" · "Facture certifiée émise sur chaque vente"
```
