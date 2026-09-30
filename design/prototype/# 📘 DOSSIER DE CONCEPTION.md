# 📘 DOSSIER DE CONCEPTION

## Module Tontine — Swimpay

### Document collaboratif de réflexion et de spécification

**Version :** 1.0
**Date :** 2026
**Statut :** Pré-développement — En attente de revue critique
**Destinataire :** Claude Code (revue, critique, croisement de données)

---

## 📑 TABLE DES MATIÈRES

1. Synthèse exécutive
2. Le problème fondamental
3. Le raisonnement collaboratif (U + A)
4. Les décisions consolidées
5. Recherche marché : échecs et succès documentés
6. Les 7 lois de la tontine digitale
7. Stratégie réglementaire
8. Architecture technique retenue
9. Questions ouvertes et hypothèses non validées
10. Demandes de revue à Claude Code

---

# 1. SYNTHÈSE EXÉCUTIVE

## 1.1 Objet du document

Ce dossier présente le **raisonnement complet** ayant conduit à la conception du module Tontine de Swimpay. Il croise deux flux de pensée :

- 🧠 **APPORT UTILISATEUR (U)** — intuitions, questions, arbitrages, décisions
- 🔬 **APPORT ASSISTANT (A)** — recherche, modélisation, propositions, validation marché

L'objectif est de soumettre ce raisonnement à une **revue critique externe** (Claude Code) pour détecter incohérences, angles morts et hypothèses dangereuses.

## 1.2 En une phrase

> **Swimpay transforme la tontine — produit de crédit rotatif informel et risqué — en un produit financier structuré, automatisé et sécurisé, où le risque est couvert par le pré-blocage progressif, la dissuasion par le score interne, et la motivation par la cagnotte de sortie, dans un cadre réglementaire porté par un EME agréé.**

## 1.3 Les 8 piliers du modèle

| # | Pilier | Fonction |
|---|---|---|
| 1 | Pré-blocage progressif | Couverture du risque de défaut |
| 2 | Architecture à 3 zones | Levier psychologique |
| 3 | Architecture à 4 caisses | Autonomie financière de la tontine |
| 4 | Garantie à 3 niveaux | Portage collectif du risque |
| 5 | Score interne + global | Dissuasion et réputation |
| 6 | Cagnotte de sortie | Motivation à la bonne conduite |
| 7 | Sanctions graduées | Dissuasion interne |
| 8 | Deux modes de tontine | Global vs Fermé |

---

# 2. LE PROBLÈME FONDAMENTAL

## 2.1 La tontine est un produit de crédit rotatif déguisé

**Démonstration mathématique :**

Soit une tontine de 10 membres × 10 000 XOF × 10 tours.

- Chaque membre paie : 10 × 10 000 = **100 000 XOF**
- Chaque membre reçoit une fois : 10 × 10 000 = **100 000 XOF**
- **Solde net = 0** → équilibre parfait sur le cycle

**MAIS** l'analyse temporelle révèle l'asymétrie :

| Position | Payé avant réception | Reste à payer | Position nette au moment du gain |
|---|---|---|---|
| Tour 1 | 0 | 90 000 | **+100 000 (cash in hand)** |
| Tour 5 | 40 000 | 50 000 | +60 000 |
| Tour 10 | 90 000 | 0 | +10 000 seulement |

## 2.2 Le vrai risque

Le gagnant du tour 1 reçoit 100 000 XOF **sans avoir rien payé**. Il a donc un intérêt économique majeur à disparaître immédiatement. Il a contracté une **dette implicite non sécurisée** envers les 9 autres membres.

**Conséquence directe :** chaque tour anticipé crée une créance non sécurisée. La tontine doit être traitée avec les mêmes exigences qu'un **prêteur**.

## 2.3 Réaction de l'utilisateur

> 🧠 **U :** *"Je pense que dans une tontine à la fin tout le monde encaisse ce qu'il a épargné, sauf si je tombe dans un piège mathématique."*

> 🔬 **A :** *L'intuition est juste sur le total (solde net = 0). Le piège n'est pas comptable, il est temporel. C'est cette distinction qui change tout le design.*

**📌 Décision actée :** la tontine est traitée comme un **produit de crédit rotatif**.

---

# 3. LE RAISONNEMENT COLLABORATIF

## 3.1 Phase 1 — Le mécanisme de garantie

### 🧠 Apport utilisateur

> *"Le pré-blocage progressif c'est l'élément qu'on doit manipuler correctement pour rendre robuste le business. Si c'est une tontine comme celle de l'exemple, la condition d'éligibilité est d'avoir minimum 100.000 XOF gelés. Ensuite cet argent est redistribué progressivement selon la liste. Mais comme les humains sont des êtres d'une nature complexe, il faut utiliser des biais psychologiques pour que ça passe dans le cerveau sans problème. Soit on gèle un certain % des frais d'éligibilité, et l'autre % est à la merci de l'utilisateur pour sa liberté, mais ils sont enfermés sous certaines conditions : ils ne peuvent quitter son compte ni être débités par un service tiers, mais l'argent peut se mouvoir dans l'application."*

### 🔬 Formalisation par l'assistant

**Architecture à 3 zones :**

| Zone | Mobilité | Rôle |
|---|---|---|
| **Libre** | Retrait, virement, débit | Liberté totale |
| **Enfermée** | Mouvement **interne Swimpay uniquement** | Garantie + contrôle perçu |
| **Bloquée** | Immobile | Couverture pure du risque |

**Principe psychologique :**
- L'utilisateur **voit** son argent (pas de sensation de perte)
- Il peut **l'utiliser dans l'écosystème** Swimpay (sentiment de contrôle)
- Il ne peut pas **le faire disparaître** (sécurité réelle)
- Il **récupère sa liberté progressivement** (récompense pour bonne conduite)

**Implication stratégique :** Swimpay doit développer un **écosystème marchand interne** pour que la zone enfermée ait une valeur perçue. Sinon elle est vécue comme une confiscation.

**📌 Décision actée :** pré-blocage progressif + architecture à 3 zones.

## 3.2 Phase 2 — Le portage du risque

### 🧠 Apport utilisateur

> *"Si un utilisateur ne paie pas son tour, Swimpay avance s'il n'a plus de garantie, et on porte plainte contre lui à la PLCC — son manquement est un fait très grave. Le mécanisme de garantie est un élément très important à manipuler pour le succès de cette fonctionnalité. Le fait d'avoir un garant qui peut être débité pour porter la caution d'un user est bien mais insuffisant."*

### 🔬 Proposition de l'assistant

**Architecture à 3 niveaux de garantie :**

1. **Niveau 1 — Individuel** : solde bloqué + score + garant tiers
2. **Niveau 2 — Collectif** : fonds de réserve de la tontine (restituable)
3. **Niveau 3 — Swimpay** : fonds de réserve global (dernier recours) → puis plainte PLCC

### 🧠 Décisions utilisateur

> *"Q1 — Le collectif. Q5 — Frais % par pot + frais fixes, ça constituera la somme qui permettra à Swimpay d'avancer automatiquement la participation d'un membre."*

**📌 Décision actée :** portage collectif à 3 niveaux, financement par frais.

## 3.3 Phase 3 — La tontine autonome

### 🧠 Apport utilisateur

> *"Je pense qu'on peut rendre les tontines autonomes avec un fonds d'entretien pour gérer les problèmes de la tontine. Il faut établir un mécanisme de dissuasion interne pour empêcher les arnaques de tout genre. Les mécanismes de sanctions que tu as proposés ne sont pas mauvais, mais je reste persuadé qu'on peut faire mieux."*

### 🔬 Architecture à 4 caisses proposée

| Caisse | Fonction | Alimentation |
|---|---|---|
| **1. Pot du tour** | Versé au gagnant | Contributions du tour |
| **2. Fonds d'entretien** | Avances, arbitrage, garanties | Prélèvement sur chaque tour |
| **3. Caisse de solidarité** (optionnelle) | Décès, maladie, urgence | Cotisation volontaire |
| **4. Frais Swimpay** | Rémunération + réserve globale | Prélevée à chaque tour |

**Principe d'autonomie :** chaque tontine a ses propres règles, son propre fonds, ses propres mécanismes de dissuasion, sa propre gouvernance. Swimpay n'intervient qu'en **dernier recours**.

### 🔬 Les 5 leviers de dissuasion interne (proposition)

1. **Réputation locale** — score interne visible dans le cercle
2. **Priorité future** — bien payer aujourd'hui = priorité demain
3. **Intérêt sur fonds bloqués** — carotte pour bonne conduite
4. **Vote de confiance** — les bons membres gouvernent
5. **Traçabilité sociale** — transparence totale sur qui a payé

### 🔬 Cagnotte de sortie (carotte ultime)

Redistribution en fin de tontine :
- 50% aux membres irréprochables
- 30% à Swimpay (bénéfice)
- 20% à la caisse de solidarité suivante

**Objectif :** bien se comporter rapporte plus que ce qu'on a mis.

**📌 Décision actée :** tontine autonome + 4 caisses + dissuasion interne (en cours d'affinage).

## 3.4 Phase 4 — Les cas limites

### 🧠 Q3 — Défaut de paiement

> *"Report son tour et on le remplace automatiquement, mais selon qu'il ait déjà pris un tour ou pas. Je ne suis pas très sûr de cette réponse — pour répondre avec sagesse, qu'est-ce que les humains font dans la vraie vie ?"*

### 🔬 Recherche terrain

Dans les tontines traditionnelles réelles :
- **Cercle fermé** — on ne fait pas de tontine avec des inconnus
- **Réputation comme monnaie** — exclusion de toutes les tontines du quartier
- **Ordre négocié** — pas aléatoire, selon le besoin (mariage, rentrée, deuil)
- **Garant physique** — un aîné se porte caution morale
- **Sanction graduée** — prévenir la famille, humilier, exclure, puis plainte
- **Petits montants au début** — on augmente avec la confiance

**Traduction pour Swimpay :**

| Situation | Décision |
|---|---|
| Membre n'a **pas encore reçu** son tour | Remplacement possible |
| Membre a **déjà reçu** son tour | Sa dette est née → recouvrement (pas de remplacement) |

### 🧠 Q4 — Décès

> *"On a besoin du certificat de décès et si c'est confirmé, il est automatiquement remplacé par quelqu'un d'autre, et s'il devait être le gagnant d'un tour, son ayant droit récupère."*

### 🔬 Procédure cadrée

1. Constat : notification + certificat de décès
2. Vérification : 7 jours max
3. Cas :
   - **Avant réception** → remplacement ou clôture + remboursement ayants droit
   - **Après réception** → garantie couvre les tours restants
   - **Devait être gagnant** → pot versé aux ayants droit
4. Documentation notariée

### 🧠 Q6 — Faillite Swimpay

> *"Si Swimpay fait faillite on fera ce qu'il faut."*

### 🔬 Alerte

**Question critique non résolue :** les fonds séquestrés doivent être **juridiquement isolés** (trust, compte séquestre bancaire). Sinon ils sont dans le bilan Swimpay et saisissables en cas de faillite.

### 🧠 Q7 — Multi-pays

> *"On n'est pas encore dans le multipays. Finissons d'établir notre modèle, ensuite on répliquera ailleurs."*

**📌 Décisions actées :** report + remplacement (nuancé), procédure décès cadrée, mono-pays d'abord.

## 3.5 Phase 5 — Le tirage au sort

### 🧠 Exigence utilisateur

> *"La liste des participants est établie sur la base du pur hasard devant les membres connectés. Elle est ensuite présentée une bonne fois pour toutes, plus de possibilité de faire marche arrière."*

### 🔬 Protocole proposé

**Off-chain + hash public horodaté :**

1. Swimpay publie un hash de la liste + nonce secret avant le tirage
2. Tirage en direct devant les membres connectés
3. Seed = timestamp UTC + hash liste + entropie collective (clics membres)
4. Seed révélé publiquement + résultat calculé en direct
5. Vérifiable : `hash(liste + seed) = ordre affiché`
6. Ordre figé dans un registre interne **append-only**

### 🧠 Q2 — Décision utilisateur

> *"Off-chain."*

**📌 Décision actée :** tirage off-chain + hash public.

## 3.6 Phase 6 — Les modes de tontine

### 🧠 Apport utilisateur

> *"J'ai compris qu'on pouvait ouvrir des modes de tontine, l'un global avec des inconnus, l'autre avec des personnes de confiance qu'on invite."*

### 🔬 Formalisation

| Critère | **GLOBALE** | **FERMÉE** |
|---|---|---|
| Membres | Inconnus (matching) | Invités |
| Confiance | Réputation Swimpay | Confiance interpersonnelle |
| Garantie | Élevée | Plus faible |
| Plafond | Bas au départ | Élevé possible |
| Frais | Plus élevés | Plus bas |
| Tirage | Aléatoire obligatoire | Aléatoire ou négocié |
| Gouvernance | Swimpay arbitre | Les membres arbitrent |

**📌 Décision actée :** deux modes distincts.

---

# 4. LES DÉCISIONS CONSOLIDÉES

## 4.1 Tableau des décisions Q1 à Q7

| # | Question | Décision | Statut |
|---|---|---|---|
| **Q1** | Portage du risque de défaut | **Collectif** (3 niveaux) | ✅ Tranché |
| **Q2** | Tirage on-chain ou off-chain | **Off-chain** + hash public | ✅ Tranché |
| **Q3** | Défaut de paiement | Report + remplacement (nuancé) | ✅ Tranché |
| **Q4** | Décès d'un membre | Certificat → remplacement ou ayants droit | ✅ Tranché |
| **Q5** | Modèle de frais | **% du pot + frais fixes** | ✅ Tranché |
| **Q6** | Faillite Swimpay | À traiter (isolation juridique) | ⚠️ En suspens |
| **Q7** | Multi-pays | Mono-pays d'abord | ✅ Tranché |

## 4.2 Décisions complémentaires

- ✅ Argent **enfermé** (mobile dans l'app) plutôt que **gelé** (invisible)
- ✅ Tontine **autonome** avec fonds d'entretien propre
- ✅ **Dissuasion interne** > sanction externe
- ✅ **Pré-blocage progressif** = cœur du système
- ✅ **Score interne** visible par les membres du cercle
- ✅ **Cagnotte de sortie** pour récompenser la bonne conduite

---

# 5. RECHERCHE MARCHÉ : ÉCHECS ET SUCCÈS

## 5.1 Échecs documentés et causes

### ❌ MaTontine (Sénégal) — Échec réglementaire

**Contexte :** pilote mené avec le partenaire microfinance Cofina. Objectif : 1 200 clients, 570 petits prêts.

**Résultats :** 13 362 téléchargements → 4 107 échanges effectifs seulement.

**Cause d'échec :** MaTontine n'était pas autorisé à s'associer à une institution de microfinance pour proposer des prêts en son nom. La plateforme a dû prêter directement aux clients, alourdissant son bilan.

**Leçon pour Swimpay :** le partenariat avec un établissement agréé (BCEAO) doit être **structurel dès le départ**.

### ❌ SUSU (France/Afrique) — Échec structurel

**Contexte :** insurtech présente en Côte d'Ivoire, Cameroun, Sénégal, RDC. Levée de **9 millions $** (INCO Ventures, Al Mada Ventures, Janngo Capital).

**Résultat :** liquidation judiciaire en juin 2026. Jamais atteint l'équilibre opérationnel. Pertes : 329 366 € en 2024, déficit reportable de 2,2 M€.

**Cause d'échec :** modèle basé sur des redevances reversées par les filiales africaines à la holding française → dépendance structurelle fatale.

**Leçon pour Swimpay :** ne pas créer de holding offshore ponctionnaire. La valeur doit rester **dans l'écosystème local**.

### ❌ TontineTrust — Échec technologique

**Contexte :** application de la blockchain aux tontines.

**Cause d'échec :** la littérature académique note que *"leur complexité était souvent une barrière pour le public cible des Esusu traditionnels"*. Les utilisateurs ne comprennent pas la blockchain, les smart contracts, les wallets décentralisés.

**Leçon pour Swimpay :** la technologie doit être **invisible**. L'utilisateur voit une interface simple.

### ❌ Fundu — Échec réseau d'acceptation

**Contexte :** 13 362 téléchargements, 9 834 identités sociales liées, 7 749 comptes bancaires liés.

**Cause d'échec :** la moitié des échanges ont eu lieu en cash point, pas via l'app. Réseau d'acceptation externe insuffisant. Problèmes réglementaires : commercialisé comme ATM sans licence complète.

**Leçon pour Swimpay :** l'intuition de la **zone enfermée** est exactement la réponse. Si l'argent ne peut circuler que dans l'écosystème Swimpay, le réseau se construit **en interne**.

### ❌ Constat transversal

> *"La plupart des apps de tontine échouent parce qu'elles copient l'UX occidentale, text-first, individual-first, et ignorent le vrai système d'exploitation : les langues locales, le KYC social, la gouvernance flexible des groupes, et les rythmes liés aux jours de marché, aux transferts et aux saisons."*
> — Medium, 2026

## 5.2 Succès documentés et facteurs clés

### ✅ MoneyFellows (Égypte) — Le leader

| Indicateur | Valeur |
|---|---|
| Utilisateurs | **8,5 millions** |
| Volume total transactions | **1,5 milliard $** |
| Groupes complétés | **2 millions+** |
| Paiement moyen par utilisateur | **900 $** (doublé en 2,5 ans) |
| Rentabilité | **Atteinte** |

**Facteurs de succès :**
- **Viralité naturelle** : chaque nouveau membre entraîne son cercle informel
- **Risque maîtrisé** : MoneyFellows ne couvre que **7 à 8% des places manquantes**
- **Capital-light** : risque transféré aux membres, pas porté sur le bilan
- **Adaptation culturelle** : digitalise la "gam'eya" égyptienne, pas un concept occidental

**Validation pour Swimpay :** pré-blocage progressif ✅, viralité cercle-par-cercle ✅.

### ✅ Ollo Africa / Ohana Africa (Togo) — Le pionnier agréé

**Contexte :** première fintech togolaise agréée par la BCEAO sur le segment tontine.

**Résultats :**
- Capitalisation portée de 68 millions FCFA à **1 milliard FCFA** (1,65 M$)
- ~5 000 comptes familiaux gérés au Togo
- Partenariat stratégique avec **Ecobank**
- Partenariat avec les syndicats artisans (UCRM)

**Facteurs de succès :**
- **Agrément réglementaire d'abord**, scale ensuite
- **Partenariat bancaire** pour sécuriser les flux
- **Technologie adaptée aux réalités culturelles** et linguistiques
- **Préservation de l'essence sociale** de la tontine

**Validation pour Swimpay :** agrément stratégique ✅, partenariats avec structures existantes ✅.

### ✅ Esusu (USA) — L'adaptation culturelle

**Contexte :** fintech américaine adaptant le concept Esusu (ROSCA yoruba) au contexte américain.

**Résultats :**
- Valorisation **1,2 milliard $**
- Levée initiale : **100 000 $** en dettes de cartes de crédit
- Soutien de Serena Williams

**Facteurs de succès :**
- **Reconnaissance de l'informel** : transforme un comportement informel en identité financière formelle (score de crédit)
- **Zero-interest rent relief** : quand un membre ne peut pas payer, Esusu paie directement le propriétaire
- **Credit building** : report des paiements de loyer aux bureaux de crédit

**Validation pour Swimpay :** fonds de réserve qui avance ✅, score comme actif transférable ✅.

### ✅ Exuus (Rwanda) — Le scoring comportemental

**Contexte :** infrastructure de crédit AI pour les groupes d'épargne.

**Produit :** SAVE Score, intégré dans les banques et plateformes de mobile money.

**Validation pour Swimpay :** le score interne comme produit rentable ✅.

## 5.3 Tableau comparatif synthétique

| Entreprise | Statut | Cause | Leçon Swimpay |
|---|---|---|---|
| MaTontine | ❌ Échec | Partenariat MFI impossible | Agrément/partenariat d'abord |
| SUSU | ❌ Liquidation | Holding ponctionnaire | Modèle 100% local |
| TontineTrust | ❌ Échec | Blockchain incompréhensible | Tech invisible |
| Fundu | ❌ Échec | Réseau externe insuffisant | Écosystème interne |
| MoneyFellows | ✅ 8,5M users | Risque transféré, viralité | Pré-blocage + cercles |
| Ollo Africa | ✅ Agréé BCEAO | Agrément + partenariat | Stratégie réglementaire |
| Esusu | ✅ 1,2 Md$ | Rent reporting | Fonds de réserve |
| Exuus | ✅ Rentable | SAVE Score | Score comme produit |

---

# 6. LES 7 LOIS DE LA TONTINE DIGITALE

Synthèse des apprentissages marché :

| # | Loi | Justification |
|---|---|---|
| **1** | L'agrément d'abord | MaTontine a échoué faute de cadre ; Ollo Africa a réussi avec |
| **2** | La culture avant la tech | TontineTrust a échoué avec la blockchain ; MoneyFellows a réussi avec la gam'eya |
| **3** | Le risque transféré aux membres | MoneyFellows couvre 7-8% seulement, le reste est sur les membres |
| **4** | La viralité cercle-par-cercle | MoneyFellows : 8,5M users en croissance organique |
| **5** | Le local d'abord | SUSU a échoué avec sa holding France ; Ollo Africa réussit en local |
| **6** | L'argent reste dans l'écosystème | Fundu a échoué avec les cash points externes |
| **7** | Le score comme produit | Exuus et Esusu en ont fait un actif rentable et transférable |

---

# 7. STRATÉGIE RÉGLEMENTAIRE

## 7.1 Le constat

**Manipuler les fonds de la tontine = activité d'émission de monnaie électronique.**

La BCEAO est catégorique : *"aucune structure ou établissement ne peut exercer des activités d'émission de monnaie électronique, sans avoir été dûment agréé ou autorisé préalablement par la Banque Centrale."*

**Sans cadre :** activité illégale, risque de qualification de "placement illégal".

## 7.2 Les deux modèles de partenariat

| Modèle | Description |
|---|---|
| **Non bancaire** | EME agréé porte la licence, Swimpay = opérateur technique |
| **Bancaire** | Banque/MFI porte l'émission, Swimpay = prestataire technique |

**Cadre réglementaire :** la BCEAO prévoit qu'un EME peut conclure des *"accords de partenariat avec un ou plusieurs opérateurs techniques"*, dont l'activité se limite au traitement technique ou à la distribution, sous la responsabilité de l'émetteur.

## 7.3 Trajectoire recommandée

**Phase 1 — Court terme (lancement) :**
- Identifier un EME agréé (opérateur mobile money, fintech comme Ollo Africa, ou banque partenaire)
- Devenir son **opérateur technique**
- Éviter le capital requis de **300M FCFA** pour agrément propre

**Phase 2 — Moyen terme (croissance) :**
- Une fois la traction prouvée, demander son propre agrément
- Internaliser la fonction pour capter la marge de l'émission

## 7.4 Précédent inspirant

**Ollo Africa** a combiné :
- Agrément propre d'établissement de paiement BCEAO
- Partenariat stratégique avec **Ecobank** pour la solidité de l'infrastructure

→ Preuve que les deux approches peuvent se combiner.

---

# 8. ARCHITECTURE TECHNIQUE RETENUE

## 8.1 Les 8 piliers

### Pilier 1 — Pré-blocage progressif

| Position | Garantie requise (exemple 100 000 XOF) |
|---|---|
| Tour 1 | ~90 000 |
| Tour 5 | ~50 000 |
| Tour 10 | ~0 |

### Pilier 2 — Architecture à 3 zones

| Zone | Mobilité |
|---|---|
| Libre | Retrait, virement, débit |
| Enfermée | Mouvement interne Swimpay uniquement |
| Bloquée | Immobile |

### Pilier 3 — Architecture à 4 caisses

1. Pot du tour
2. Fonds d'entretien
3. Caisse de solidarité (optionnelle)
4. Frais Swimpay

### Pilier 4 — Garantie à 3 niveaux

1. Individuel
2. Collectif (tontine)
3. Swimpay (global)

### Pilier 5 — Score interne + global

- Score interne tontine (visible membres)
- Score Swimpay global (inter-tontines)
- Score transférable (externe)

### Pilier 6 — Cagnotte de sortie

- 50% irréprochables / 30% Swimpay / 20% caisse suivante

### Pilier 7 — Sanctions graduées à 7 niveaux

| Niveau | Déclencheur | Sanction |
|---|---|---|
| 0 | Retard < 24h | Notification |
| 1 | Retard 24-72h | Perte points |
| 2 | Retard > 72h | Débit zone bloquée |
| 3 | Défaut 1 tour | Débit zone enfermée |
| 4 | Défaut 2 tours | Exclusion tirages futurs |
| 5 | Défaut définitif | Débit garant tiers |
| 6 | Fraude avérée | Plainte PLCC |
| 7 | Récidive | Bannissement |

### Pilier 8 — Deux modes

- **GLOBALE** : inconnus, garantie élevée, tirage aléatoire
- **FERMÉE** : invités, garantie faible, tirage négocié possible

## 8.2 Cycle de vie d'une tontine

```
1. CRÉATION       → paramètres + calcul garanties + règles
2. RECRUTEMENT    → invitation (fermé) ou matching (global)
3. VALIDATION     → KYC + éligibilité + anti-collusion
4. GARANTIES      → alimentation zones bloquée + enfermée
5. TIRAGE         → en direct, vérifiable, immuable
6. EXÉCUTION      → tours 1 à N : prélèvement → pot → frais → scores
7. GOUVERNANCE    → votes en cours
8. CLÔTURE        → libération zones + cagnotte + scores
9. POST-CLÔTURE   → recouvrement + PLCC + parrainage
```

---

# 9. QUESTIONS OUVERTES ET HYPOTHÈSES NON VALIDÉES

## 9.1 Questions techniques à trancher

| # | Question | Proposition actuelle |
|---|---|---|
| 1 | % exact du fonds d'entretien | 2-3% du pot |
| 2 | Taux d'intérêt sur fonds bloqués | 1-2% annuel |
| 3 | Barème exact du score interne | À définir |
| 4 | Nombre min/max de membres | 5 à 20 |
| 5 | Plafond par niveau de score | À définir |
| 6 | Mode de gouvernance | Majorité simple/qualifiée/unaminité ? |
| 7 | Mode hybride | Dès le lancement ? |
| 8 | Seuil de déclenchement PLCC | À définir |
| 9 | Structure d'isolation des fonds (Q6) | Trust / compte séquestre ? |
| 10 | Mécanisme anti-collusion | Détection device/IP/transactions |

## 9.2 Hypothèses non encore validées

- ⚠️ La **zone enfermée** a une valeur perçue suffisante
- ⚠️ Le **score interne** est un produit transférable viable
- ⚠️ La **cagnotte de sortie** motive réellement à l'échelle
- ⚠️ Les **7 niveaux de sanction** sont optimaux
- ⚠️ Le modèle économique (% + fixe) est rentable à l'échelle
- ⚠️ L'architecture 4 caisses × 3 zones × 7 sanctions est maintenable

## 9.3 Angles morts identifiés mais non résolus

- **Anti-collusion** : détection de liens entre membres (device, IP, transactions croisées)
- **Chargeback** : paiement par carte annulé après réception du pot
- **Blanchiment** : fonds d'origine frauduleuse via la tontine
- **Ingénierie sociale** : un membre convainc les autres de sortir du cadre Swimpay
- **Pression sociale** : coercition sur les derniers de la liste
- **Dévaluation/inflation** : impact sur les cycles longs
- **Fonds séquestrés non isolés** : risque de saisie en cas de faillite Swimpay

---

# 10. DEMANDES DE REVUE À CLAUDE CODE

## 10.1 Croisement des flux (U + A)

Merci de croiser les deux flux de raisonnement (U et A) et de rendre un avis critique sur :

### 1. Cohérence interne
- Les 8 piliers sont-ils mutuellement compatibles ?
- Y a-t-il des contradictions entre les décisions Q1-Q7 ?
- Les hypothèses non validées sont-elles critiques ou accessoires ?

### 2. Angles morts
- Quels vecteurs d'arnaque ou de défaillance n'ont **pas** été anticipés ?
- Quels cas limites manquent ?
- Quelles hypothèses implicites sont dangereuses ?

### 3. Faisabilité technique
- Points d'implémentation les plus complexes ?
- Alternatives plus simples pour chaque module ?
- Ledger double-entry natif : indispensable ?

### 4. Modèle économique
- % du pot + frais fixes : viable ?
- Sous-estimé / surestimé ?
- Le fonds de réserve peut-il couvrir le risque réel ?

### 5. Scalabilité
- Architecture 4 caisses × 3 zones × 7 sanctions : maintenable à 10 000+ tontines ?
- Complexité UX pour utilisateur non bancarisé ?

### 6. Conformité
- Modèle "opérateur technique d'un EME" suffisant ?
- Risques juridiques non identifiés ?

### 7. Recommandations prioritaires
- **3 choses à changer avant de coder**
- **3 choses à approfondir avant de lancer**
- **3 risques à surveiller en permanence**

## 10.2 Contraintes pour la revue

- **Public cible :** utilisateurs non bancarisés, mobile-first, UEMOA (Togo/Côte d'Ivoire en priorité)
- **Contrainte réglementaire :** BCEAO, agrément EME ou partenariat
- **Contrainte technique :** off-chain, ledger interne, API EME partenaire
- **Contrainte culturelle :** langues locales, rythmes de marché, KYC social

## 10.3 Format attendu de la réponse

1. **Verdict global** (architecture validée / à revoir / à repenser)
2. **Points forts** (ce qui est solide)
3. **Points faibles** (ce qui est fragile)
4. **Angles morts détectés** (liste exhaustive)
5. **Recommandations prioritaires** (3 changements avant de coder)
6. **Questions à clarifier** (points nécessitant des décisions)

---

## 🎯 CONCLUSION

Ce dossier présente **un raisonnement complet, documenté et validé marché** pour la conception du module Tontine de Swimpay. Il combine :

- **Intuitions utilisateur** (U) issues de la connaissance terrain
- **Formalisation assistant** (A) appuyée sur la recherche
- **Validation marché** avec 4 échecs et 4 succès documentés
- **Décisions consolidées** (Q1-Q7 + complémentaires)
- **Questions ouvertes** clairement identifiées

**Le modèle est structurellement cohérent** mais présente des **hypothèses à valider** et des **angles morts à combler** avant le développement.

**Merci à Claude Code pour sa revue critique indépendante.**

---

**FIN DU DOCUMENT**

*Version 1.0 — En attente de revue*