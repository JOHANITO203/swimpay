# SwimPay — Le Projet

> Document de présentation pour partenaires. Version simple.
> (Version visuelle en ligne : voir l'artifact « SwimPay — Le Projet ».)

## 1. En une phrase

SwimPay met de l'ordre dans l'argent des entreprises et des commerçants
ivoiriens : encaisser sur tous les réseaux, facturer automatiquement (la facture
électronique obligatoire), rapprocher chaque paiement de chaque vente, payer
salaires et fournisseurs en un clic — et demain, ouvrir l'accès au crédit.

## 2. Pourquoi maintenant — 3 faits

1. **La loi force l'adoption.** La Facture Normalisée Électronique (FNE) est
   obligatoire pour TOUTES les entreprises, jusqu'aux micro-entreprises (depuis
   août 2025). Sans elle : pas de TVA déductible, pas d'attestation fiscale.
   Personne ne rend ça simple pour les PME.
2. **Les transferts deviennent gratuits.** La Banque Centrale (BCEAO) a lancé un
   rail qui rend les envois entre Wave/Orange/MTN/Moov/banques gratuits et
   instantanés (obligatoire pour les acteurs en 2026). Les business de transfert
   meurent ; nous, on vend le **logiciel** autour — il survit et en profite.
3. **Le marché est immense** : ~2,8 milliards de transactions mobile money par
   an en Côte d'Ivoire, ~25 millions de comptes.

## 3. Ce qu'on vend, à qui (le plan)

| Cible | Ce qu'on lui vend | Rôle dans le plan |
|---|---|---|
| **PME** | Facturation FNE automatique (import Excel, connexion DGI, API), caisse, paiements | **Premier client** — les listes sont prêtes, la facturation est l'argument |
| **Comptables** | Console multi-dossiers (1 comptable = 20-50 entreprises) | **Le canal** — on convainc le berger, pas chaque mouton |
| **Commerçants** | Un QR unique (tous wallets + carte) + caisse + factures | Le volume |
| **Grand public** | Transferts / swap entre réseaux — payant tant que la fenêtre est ouverte, gratuit à l'arrivée du rail | **Se positionner comme LA référence transfert** — l'hameçon |
| **E-commerce** | Checkout web : paiement par n'importe quel wallet ou banque | La surface en ligne |
| **Entreprises** | Mobile↔banque (gros montants, paiements en masse, justificatifs) + paie 1-clic | Le service qui reste payant même quand le rail est gratuit |

**Ventes cash incluses** : la facture couvre TOUTES les ventes, peu importe
comment le client a payé (SwimPay, virement, espèces). Paiement via SwimPay →
facture automatique ; autre paiement → 30 secondes de saisie. Ça renforce le
produit : l'outil fait 100 % du travail de facturation, pas la moitié.

## 4. Comment ça marche — le coffre et les enveloppes

- **Un seul vrai compte** (« le coffre ») chez un partenaire licencié par la
  BCEAO. C'est SA licence qui fait le travail — pas besoin des 300 millions
  d'une licence d'émetteur.
- **SwimPay tient les enveloppes** : le registre de qui possède quoi. Un
  identifiant unique par client, relié à tous ses numéros et comptes.
- **L'argent ne dort jamais chez SwimPay** (montage « pass-through ») : il
  transite par le coffre du partenaire, SwimPay note et pilote. Léger, légal,
  rapide à lancer.
- Contrôle permanent : la somme des enveloppes = le solde du coffre, vérifié
  chaque jour.

## 5. Le cerveau et les bras — la V1

**Les bras** (les API des partenaires) bougent l'argent et valident les
factures. **Le cerveau** (notre algorithme) décide : qui a payé quoi, à qui
appartient cet argent, quelle facture générer, par quel chemin verser.

**La V1 = le cerveau complet : 4 modules construits, prêts à recevoir les bras.**

1. **Le Rapprocheur** — relie chaque paiement à chaque vente. « Ce 12 000 F reçu
   à 14h02 = cette vente → coché. » C'est le produit lui-même.
2. **Le Moteur de factures** — chaque vente → facture normalisée envoyée à la
   DGI. Import Excel des clients/produits existants ; plus tard, une API pour
   que les logiciels des PME génèrent leurs FNE à travers nous.
3. **L'Annuaire d'identité** — 1 client = N numéros + comptes, vérifiés. La
   couche que personne d'autre ne construit.
4. **Le Routeur** — chaque sortie d'argent passe par le meilleur chemin
   (wallet, banque). Simple avec un partenaire, précieux dès le deuxième.

**La règle d'or de conception** (s'applique à tout) :
- chaque module **enregistre tout dès le premier jour** (même ce qui ne sert
  pas encore) ;
- chaque module **apprend avec les données** — chaque paiement rapproché,
  chaque facture émise, chaque litige résolu le rend plus intelligent ;
- chaque module est conçu pour être, plus tard, **accéléré et rendu autonome**
  (vitesse d'exécution, intelligence des décisions, actions indépendantes).

Les bras sont interchangeables ; le cerveau est à nous. C'est lui qui prend de
la valeur avec le temps.

## 6. Les bras — la liste des API (issue de nos recherches vérifiées)

| API / Partenaire | À quoi elle sert pour SwimPay | Statut |
|---|---|---|
| **PayDunya** (licencié BCEAO CI, EP.CI.008) | Encaisser et verser sur les 4 wallets (Orange, Wave, MTN, Moov) + Djamo + banque. **Rail principal.** | API et sandbox **vérifiées et fonctionnelles** — on peut coder aujourd'hui |
| **Portail FNE de la DGI** (fne.dgi.gouv.ci) | Émettre les factures normalisées obligatoires | Obligatoire — automatisation à construire (module 2) |
| **WhatsApp Business API** | Reçus aux clients + résumé quotidien au marchand (1 message/jour, pas par transaction — maîtrise du coût) | Standard |
| **CinetPay** (licencié BCEAO CI, EP.CI.007) | Rail de secours + paiements en masse (Mass Payout) | En négociation — jamais de dépendance à un seul rail |
| **Julaya** (licencié BCEAO CI, EP.CI.004) | La paie B2B à grande échelle (leur spécialité) | Partenariat relationnel à cultiver |
| **Djamo** (licencié BCEAO CI, EP.CI.005) | Versements vers comptes Djamo aujourd'hui ; **partenaire crédit demain** (licence microfinance obtenue 2025) | À surveiller |
| **MTN MoMo Developer** | Sandbox libre et gratuit pour apprendre la mécanique des opérateurs | Disponible immédiatement |
| **PI-SPI** (rail BCEAO, via le partenaire licencié) | Transferts instantanés gratuits inter-réseaux et vers les banques | 2026 — on s'y branche via le partenaire |

## 7. Les chiffres — ce que SwimPay facture

| Service | Prix | Note |
|---|---|---|
| Abonnement PME (facturation + multi-caisses + exports) | **10 000 F/mois** | Le cœur du revenu |
| Abonnement commerçant | **2 500 – 5 000 F/mois** | Sous les outils FNE existants (~12 000 F) |
| Console comptable | Gratuite < 10 dossiers, puis **1 000 – 2 000 F/dossier/mois** | Le comptable refacture à ses clients |
| Encaissement QR | **~1 %** (prix coûtant) | Produit d'appel — aligné sur le réflexe Wave |
| Checkout e-commerce | **1,5 – 2 %** par transaction | |
| Paie / virements entreprise | coût + **0,3 – 0,5 %** (min. 300-500 F/opération) | Lancé seulement avec une grille de gros écrite |
| Swap grand public | **~1 %** plafonné | Temporaire — gratuit le jour où le rail est gratuit |

**Économie par client** (hypothèses prudentes) : abonnement 5 000 F − coûts
(WhatsApp ~500 F, infra ~100 F, part apporteur ~1 000 F) ≈ **3 400 F de marge
nette par client par mois**. Un client rapporte 7 à 11 fois ce qu'il coûte à
acquérir.

## 8. Quand l'entreprise devient rentable

- **Le point mort : ~140 clients payants** à 5 000 F/mois (≈ 690 000 F/mois),
  qui couvrent l'infrastructure, la part des apporteurs et le fondateur.
- **Trajectoire réaliste** : mois 3 → 10-15 payants (prépayés 3 mois) · mois 6
  → ~100 payants · mois 9-12 → **rentabilité** · mois 12 → 200-300 payants
  (1 à 1,5 M F/mois de revenu récurrent).
- Au-delà de 140, **chaque nouveau client est de la marge** — et le coût de
  servir un client de plus est quasi nul (c'est du logiciel).

## 9. Le partenariat — participer à la croissance

**Ce qu'on cherche chez un partenaire** : un portefeuille de clients réel
(des rendez-vous tenus, pas une liste), de la distribution, une crédibilité
sectorielle — ou du capital au bon moment.

**Les trois façons de participer :**

1. **Apporteur d'affaires** — 20 % des abonnements apportés, pendant 12 mois,
   plus une prime à l'activation de chaque client. Zéro fixe : le partenaire
   gagne quand SwimPay gagne.
2. **Partenaire de lancement** — les entreprises pilotes qui paient d'avance
   (3 mois) obtiennent le **tarif fondateur à vie** et la priorité sur les
   fonctionnalités qu'elles demandent.
3. **Partenaire stratégique / investisseur** — à partir du mois 6, sur des
   chiffres réels (clients, revenu, rétention), entrée au capital discutée.
   On lève sur des preuves, pas sur des promesses.

**L'avenir du partenariat** : an 1 = revenus partagés sur la croissance ;
an 2 = licence propre + produits crédit — **le partenaire du début a
l'antériorité** sur tout ce qui s'ouvre.

## 10. L'avenir de SwimPay — les terrains suivants

**Objectif an 1 : notre propre licence.** Après 12 mois d'activité, déposer
notre agrément d'Établissement de Paiement auprès de la BCEAO (ou signer un
accord de distribution avec un émetteur licencié). Ce que ça débloque :

- **marges sans intermédiaire** (plus de part d'agrégateur sur chaque flux) ;
- **accès direct au rail interbancaire** (PI-SPI) ;
- **soldes clients légaux** — les enveloppes deviennent de vrais comptes, le
  wallet complet s'ouvre ;
- crédibilité face aux banques et à l'État.

**Les terrains où se positionner ensuite :**

1. **Le crédit** (an 2) — 12 mois de recettes certifiées par les factures =
   un « dossier bancable ». SwimPay origine, un prêteur licencié porte le
   risque, revenu partagé. C'est ce que ni Wave ni personne n'a sur le petit
   commerce.
2. **L'API de facturation** — devenir le moteur FNE des autres logiciels
   (caisses, gestion, e-commerce).
3. **La paie B2B à grande échelle** — salaires de centaines d'employés,
   multi-réseaux, avec bulletins.
4. **Le commerce inter-pays UEMOA** — la couche de confiance (identité,
   factures, preuves) au-dessus du rail gratuit, pour importateurs/exportateurs.
5. **L'épargne et les tontines digitales** — plus tard, sur la base de
   confiance installée.
6. **La traçabilité pour l'État** — la vision long terme : être la couche que
   le gouvernement consulte, pas celle qu'il subit.

## 11. Résumé en 3 phrases

Le transfert d'argent devient gratuit — tant mieux : ce n'est pas ce qu'on
vend. On vend la **mémoire et l'ordre** de l'argent : factures, caisse,
rapprochement, paie — en abonnement, à des clients qui en ont l'obligation
légale et le besoin commercial. Le cerveau est à nous, il apprend chaque jour,
et chaque étape (clients → données → licence → crédit) rend la suivante plus
forte.
